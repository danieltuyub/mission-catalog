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

## Deploy (GitHub Actions + Caddy)

`.github/workflows/deploy.yml`:

- **Every push (main, dev) and pull request to main:** `npm run lint`, `npx tsc -b`, `npm test`. The tests mock Supabase: no container or network needed (the workflow only sets dummy `VITE_SUPABASE_*` values, which the client requires to exist).
- **Push to main or dev, after the checks pass:** builds with that target's `VITE_SUPABASE_*`, uploads `dist/` over SSH (rsync) to `<VPS_PATH>/releases/<commit>/` and then points `<VPS_PATH>/current` at it with an atomic rename. The 5 newest releases are kept (`RELEASES_TO_KEEP`), never the one in use.
- **Manual run:** GitHub → Actions → "CI and deploy" → Run workflow, choosing the branch and the target. It runs the checks and publishes that branch.
- **Not included:** migrations ("Migrations from GitHub", manual) and the Edge Function (by hand).

| Target | Published by | Secrets | Folder on the VPS | Deploy user |
| --- | --- | --- | --- | --- |
| `development` (default of a manual run) | push to `dev`, or a manual run from any branch | `development` environment | `/var/www/mission-catalog-dev` | `ghdeployer-dev` |
| `production` | push to `main`, or a manual run from `main` | `production` environment | `/var/www/mission-catalog` | `ghdeployer` |

### Secrets

**Settings → Environments**, once in `development` and once in `production`, each with its own values. Keep them out of the repository-level secrets: one missing in an environment would silently take the repository's value, maybe production's. In `production`, set "Deployment branches" to `main` only (the check inside the workflow can be edited away in a branch); you can also require an approval before each deploy.

| Secret | Value |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | the publishable values of that environment's Supabase project |
| `VPS_HOST` | server name or IP |
| `VPS_PORT` | optional, `22` by default |
| `VPS_USER` | that target's deploy user (below) |
| `VPS_PATH` | absolute path of that target's folder, e.g. `/var/www/mission-catalog` (letters, digits, `_ . / -` only) |
| `VPS_SSH_KEY` | the deploy user's **private** key (whole file) |
| `VPS_KNOWN_HOSTS` | the server's host key line(s): `ssh-keyscan -p 22 your.host` run from a network you trust, ideally compared with the server's own `/etc/ssh/ssh_host_ed25519_key.pub` |

### Server, once

```bash
# One user per target, each able to write only its own folder (no sudo, no password)
sudo adduser --disabled-password --gecos "" ghdeployer
sudo mkdir -p /var/www/mission-catalog && sudo chown ghdeployer: /var/www/mission-catalog

sudo adduser --disabled-password --gecos "" ghdeployer-dev
sudo mkdir -p /var/www/mission-catalog-dev && sudo chown ghdeployer-dev: /var/www/mission-catalog-dev

# A deploy key for each user: see "Where each value comes from" (VPS_SSH_KEY)
```

Caddy and the certificate: see "Caddy and TLS" below.

### Going back

```bash
ssh ghdeployer@your.host 'cd /var/www/mission-catalog && ls -1t releases && ln -sfn releases/<commit> current.new && mv -T current.new current'
```

(`mv -T` is GNU: fine on Linux.) For development use `ghdeployer-dev` and its folder. The next deploy of that target publishes again from there.

### Where each value comes from

| Secret | How to get it |
| --- | --- |
| `VPS_HOST` | the name you ssh to (`catalog.example.com`) or the server's IP. Use the same text in `VPS_KNOWN_HOSTS` |
| `VPS_PORT` | `sudo sshd -T \| grep '^port'` on the VPS (22 unless you changed it) |
| `VPS_USER` | `ghdeployer`, the user created in "Server, once" |
| `VPS_PATH` | the folder from "Server, once": `/var/www/mission-catalog` |
| `VPS_SSH_KEY` | on the VPS: `sudo -u ghdeployer ssh-keygen -t ed25519 -N "" -C github-actions -f /tmp/deploy_key`, then `sudo -u ghdeployer sh -c 'install -m 700 -d ~/.ssh && cat /tmp/deploy_key.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'`, then `sudo cat /tmp/deploy_key`, paste **all of it** (with the `BEGIN`/`END` lines) into the secret and `sudo shred -u /tmp/deploy_key /tmp/deploy_key.pub` |
| `VPS_KNOWN_HOSTS` | on the VPS: `echo "catalog.example.com $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"`. With a port other than 22 the line starts with `[catalog.example.com]:2222` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (the project URL and the anon / publishable key) |
| `SUPABASE_PROJECT_REF` | the `<ref>` in `https://<ref>.supabase.co` |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account (your avatar) → Access Tokens → Generate new token, scoped to that one project (see "Migrations from GitHub") |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database (reset it there if lost) |

The examples are production's: for `development` repeat them with `ghdeployer-dev`, its folder and a new key (the known-hosts line is the same, the server is the same).

The key and the known-hosts line are the only ones that need the VPS. Test the key from your own machine before pasting it: `ssh -i deploy_key -p 22 ghdeployer@catalog.example.com 'echo ok'`.

### Migrations from GitHub

`.github/workflows/migrations.yml`, manual only: Actions → "Database migrations" → Run workflow.

| Target | Run it from | Secrets and rules |
| --- | --- | --- |
| `development` (default) | any branch that has this workflow | `development` environment |
| `production` | `main` only | `production` environment |

- **Untick "apply" (default):** dry run, it prints the migrations that are pending and changes nothing.
- **Tick "apply":** runs `npm run db:push -- --yes` against that project.
- Both environments need `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`, with each project's values. They are passed as environment variables to the steps only.
- **One scoped token per environment** ([Account → Access Tokens](https://supabase.com/dashboard/account/tokens), [docs](https://supabase.com/docs/guides/platform/personal-access-tokens)): limit it to that environment's project, with **Read** on Project Settings, API Keys and API Key Secrets (what `supabase link` needs). Never a full-access ("Legacy") token: the one in `development` could reach production.
- The token's permissions do not limit what the database password can do: use a different password in each project. The token can still read that project's secret keys, so treat it as sensitive.
- In the `production` environment, set "Deployment branches" to `main` only (the check inside the workflow can be edited away in a branch), and keep these secrets in the environments, not at repository level.
- If linking or pushing fails with a network error, the runner cannot reach the database directly (Supabase's direct host can be IPv6 only). The CLI normally goes through the pooler once linked; if it does not, apply from your machine.
- The Edge Function is still deployed by hand (`npx supabase functions deploy admin-create-user --project-ref <ref>`).

**Workflow:**

1. Create the migration (`npm run db:new <name>`) and apply it to `development`, from your machine (`npm run db:push`) or from GitHub. Your machine stays linked to `development` only.
2. Test, commit, merge into `main`.
3. Run the workflow with target `production`: first the dry run, then "apply".

Do not edit or delete a migration that was already applied: add a new one. `development` is the exception, as long as you reset it afterwards (`npx supabase db reset --linked`, which erases that database).

### Caddy and TLS

Assumes Debian/Ubuntu, domains you control and the folders from "Server, once". Caddy gets and renews the Let's Encrypt certificates by itself: no certbot. Both targets share ports 80 and 443; Caddy picks the site by its domain.

1. **DNS.** An `A` record (and `AAAA` if the server has IPv6) for each domain (here `catalog.example.com` and `catalog-dev.example.org`) pointing at the VPS. Wait until `dig +short <domain>` shows it. Without it the certificate cannot be issued.
2. **Packages and firewall.** Install Caddy from its [official apt repository](https://caddyserver.com/docs/install#debian-ubuntu-raspbian), then:

   ```bash
   sudo ufw allow 80,443/tcp   # keep your SSH rule
   ```

   Nothing else may listen on 80 or 443 (another Apache, nginx or Plesk), or Caddy cannot start.
3. **Folder permissions.** Caddy (user `caddy`) must be able to walk into the folder and read the files:

   ```bash
   sudo chmod 755 /var/www /var/www/mission-catalog /var/www/mission-catalog-dev
   ```

4. **The sites.** `/etc/caddy/Caddyfile`:

   ```caddy
   (spa) {
       file_server
       encode zstd gzip

       header {
           Strict-Transport-Security "max-age=31536000"
           X-Content-Type-Options "nosniff"
           Referrer-Policy "strict-origin-when-cross-origin"
       }

       # Hashed files never change: cache them for good. The page itself is re-read to see a new release.
       @assets path /assets/*
       header @assets Cache-Control "public, max-age=31536000, immutable"
       @index path /index.html
       header @index Cache-Control "no-cache"
   }

   catalog.example.com {
       root * /var/www/mission-catalog/current
       import spa
   }

   catalog-dev.example.org {
       root * /var/www/mission-catalog-dev/current
       header X-Robots-Tag "noindex, nofollow"
       import spa
   }
   ```

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   The app routes with `#`: there is no rewrite to configure. `root` follows the `current` link, so a deploy needs no reload. Another site on the same VPS is one more block with its own domain and folder. Until the first deploy `current` does not exist and Caddy answers 404: that is expected. Do not add a `Content-Security-Policy` without testing: the app talks to Supabase and loads map tiles.

5. **Check.** `curl -I https://catalog.example.com` (and the development domain) answers `200` after the first deploy. `journalctl -u caddy -n 50` shows the certificate being issued, or why it failed.

If the site lives under a sub-path (`/catalog/`), set `base` in `vite.config.ts` first and replace `root`/`file_server` with `handle_path /catalog/* { root * /var/www/mission-catalog/current; file_server }`.
