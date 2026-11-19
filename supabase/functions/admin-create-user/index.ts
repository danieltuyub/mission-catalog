// Creates a user on behalf of an admin, with a temporary password and the chosen role.
//
// Why a function: creating accounts needs the service-role key, which must never reach the browser.
// Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY into the function's
// environment, so nothing secret lives in this repository.
//
// Deploy (see README): npx supabase functions deploy admin-create-user
import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateNewUser } from './validate.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization')
  if (!url || !anonKey || !serviceKey) return reply(500, { error: 'misconfigured' })
  if (!authorization) return reply(401, { error: 'unauthorized' })

  // Who is asking: the database decides, with the caller's own session.
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: caller, error: callerError } = await asCaller.auth.getUser()
  if (callerError || !caller.user) return reply(401, { error: 'unauthorized' })
  const { data: allowed, error: permissionError } = await asCaller.rpc('has_permission', { p: 'users.manage' })
  if (permissionError || allowed !== true) return reply(403, { error: 'forbidden' })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'invalid_body' })
  }
  const input = validateNewUser(body)
  if (!input.ok) return reply(400, { error: input.error })
  const { email, password, firstName, lastName, role } = input.value

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // `handle_new_user` (a trigger) creates the profile from these names and gives the subscriber role.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // The app asks for a new password the first time this account signs in.
    user_metadata: { first_name: firstName, last_name: lastName, must_change_password: true },
  })
  if (createError || !created.user) {
    const exists = createError?.code === 'email_exists' || /already (been )?registered/i.test(createError?.message ?? '')
    return reply(exists ? 409 : 500, { error: exists ? 'email_exists' : 'create_failed' })
  }
  const id = created.user.id

  if (role !== 'subscriber') {
    // A user holds one role: swap the default one.
    const removed = await admin.from('user_roles').delete().eq('user_id', id)
    const added = removed.error ? removed : await admin.from('user_roles').insert({ user_id: id, role })
    if (added.error) {
      // Do not leave a half-made account behind.
      await admin.auth.admin.deleteUser(id)
      return reply(500, { error: 'role_failed' })
    }
  }

  // The audit trail, with the admin's own session so it records who did it. Never fails the creation.
  await asCaller.rpc('audit_user_created', { target: id, new_role: role }).then(
    () => {},
    () => {},
  )

  return reply(200, { id })
})
