# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Database (Supabase)

Env: `cp .env.example .env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (publishable key only; never the secret key).

One-time setup:

```bash
npx supabase login
SUPABASE_PROJECT_REF=<ref> npm run db:setup   # init (if needed) + link
```

Daily workflow:

```bash
npm run db:new -- <name>   # new migration in supabase/migrations
npm run db:push            # apply pending migrations
npm run db:status          # local vs remote migrations
```

### DB password for migrations

`db:push` connects directly to Postgres and needs the database password (Project Settings → Database; reset it there if lost). It is **not** the anon/secret API key and must never go in `.env` or any `VITE_*` variable.

Pass it only for the command:

```bash
SUPABASE_DB_PASSWORD='your_password' npm run db:push
```

Or export it for the current shell session:

```bash
export SUPABASE_DB_PASSWORD='your_password'
npm run db:push
```

If unset, the CLI prompts for it. Prefix the command with a space to keep it out of zsh history (requires `HIST_IGNORE_SPACE`).

## Edge Function: `admin-create-user`

Lets an admin create accounts from **Administración → Usuarios → Nuevo usuario**, with a temporary password and the chosen role, without going to the Supabase dashboard. It exists because creating accounts needs the service-role key, which must never reach the browser.

Code: `supabase/functions/admin-create-user/` (`index.ts` is the handler, `validate.ts` the input checks, covered by `validate.test.ts`).

Deploy it (not part of `db:push`; run it again after any change to the function):

```bash
npx supabase functions deploy admin-create-user
```

- **No secrets to set.** Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` into the function. Nothing goes in `.env` or in this repo.
- **Who can call it.** Only a signed-in user with `users.manage` (admins). The function checks it with the caller's own session; anyone else gets 403.
- **What it does.** Creates the user with the email already confirmed, so it works without SMTP. The `handle_new_user` trigger creates the profile from the names and gives the subscriber role; the function swaps it for the chosen one. If setting the role fails it deletes the account again.
- **First sign-in.** The account is marked `must_change_password` (in `user_metadata`). The app then shows only a "Elige tu contraseña" screen until the user sets their own. It is a nudge, not a security boundary: the user could clear the mark from their own session.
- **Password.** The form generates a random one the admin can edit; it is shown once after creating and is not stored anywhere. Hand it over through your own channel.

When SMTP is configured, the natural next step is to invite by email (`auth.admin.inviteUserByEmail`) and drop the temporary password.

Check it by hand (replace the token with an admin's access token):

```bash
curl -X POST "$VITE_SUPABASE_URL/functions/v1/admin-create-user" \
  -H "Authorization: Bearer <admin access token>" -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@example.com","password":"Temporal-123456","firstName":"Ana","lastName":"Paz","role":"subscriber"}'
```
