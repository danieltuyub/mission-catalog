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

## Deploy (GitHub Actions + nginx)

`.github/workflows/deploy.yml`:

- **Every push (main, dev) and pull request to main:** `npm run lint`, `npx tsc -b`, `npm test`. The tests mock Supabase: no container or network needed (the workflow only sets dummy `VITE_SUPABASE_*` values, which the client requires to exist).
- **Push to main, after the checks pass:** builds with the real `VITE_SUPABASE_*`, uploads `dist/` over SSH (rsync) to `<VPS_PATH>/releases/<commit>/` and then points `<VPS_PATH>/current` at it with an atomic rename. The 5 newest releases are kept (`RELEASES_TO_KEEP`), never the one in use.
- **Manual run:** GitHub → Actions → "CI and deploy" → Run workflow, choosing the branch. It runs the checks and publishes that branch.
- **Not included:** migrations (`db:push`) and the Edge Function stay manual.

### Secrets

Repository **Settings → Secrets and variables → Actions** (or the `production` environment, which also lets you require an approval before each deploy):

| Secret | Value |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | the same publishable values as `.env` |
| `VPS_HOST` | server name or IP |
| `VPS_PORT` | optional, `22` by default |
| `VPS_USER` | the deploy user (below) |
| `VPS_PATH` | absolute path of the site's folder, e.g. `/var/www/mission-catalog` (letters, digits, `_ . / -` only) |
| `VPS_SSH_KEY` | the deploy user's **private** key (whole file) |
| `VPS_KNOWN_HOSTS` | the server's host key line(s): `ssh-keyscan -p 22 your.host` run from a network you trust, ideally compared with the server's own `/etc/ssh/ssh_host_ed25519_key.pub` |

### Server, once

```bash
# A user that can only write the site's folder (no sudo, no password)
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/mission-catalog && sudo chown deploy: /var/www/mission-catalog

# The deploy key and its public half: see "Where each value comes from" (VPS_SSH_KEY)
```

nginx and the certificate: see "nginx and TLS" below.

### Going back

```bash
ssh deploy@your.host 'cd /var/www/mission-catalog && ls -1t releases && ln -sfn releases/<commit> current.new && mv -T current.new current'
```

(`mv -T` is GNU: fine on Linux.) The next push to main publishes again from there.

### Where each value comes from

| Secret | How to get it |
| --- | --- |
| `VPS_HOST` | the name you ssh to (`catalog.example.com`) or the server's IP. Use the same text in `VPS_KNOWN_HOSTS` |
| `VPS_PORT` | `sudo sshd -T \| grep '^port'` on the VPS (22 unless you changed it) |
| `VPS_USER` | `deploy`, the user created in "Server, once" |
| `VPS_PATH` | the folder from "Server, once": `/var/www/mission-catalog` |
| `VPS_SSH_KEY` | on the VPS: `sudo -u deploy ssh-keygen -t ed25519 -N "" -C github-actions -f /tmp/deploy_key`, then `sudo -u deploy sh -c 'install -m 700 -d ~/.ssh && cat /tmp/deploy_key.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'`, then `sudo cat /tmp/deploy_key`, paste **all of it** (with the `BEGIN`/`END` lines) into the secret and `sudo shred -u /tmp/deploy_key /tmp/deploy_key.pub` |
| `VPS_KNOWN_HOSTS` | on the VPS: `echo "catalog.example.com $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"`. With a port other than 22 the line starts with `[catalog.example.com]:2222` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (the project URL and the anon / publishable key) |
| `SUPABASE_PROJECT_REF` | the `<ref>` in `https://<ref>.supabase.co` |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account (your avatar) → Access Tokens → Generate new token |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database (reset it there if lost) |

The key and the known-hosts line are the only ones that need the VPS. Test the key from your own machine before pasting it: `ssh -i deploy_key -p 22 deploy@catalog.example.com 'echo ok'`.

### Migrations from GitHub

`.github/workflows/migrations.yml`, manual only: Actions → "Database migrations" → Run workflow, **from main**.

- **Untick "apply" (default):** dry run, it prints the migrations that are pending and changes nothing.
- **Tick "apply":** runs `npm run db:push` against the linked project.
- It uses the `production` environment (approval rules and secrets) and refuses to run from any branch but main, so a migration that is not merged never reaches the database.
- Needs `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in the `production` environment. They are passed as environment variables to the steps only.
- If linking or pushing fails with a network error, the runner cannot reach the database directly (Supabase's direct host can be IPv6 only). The CLI normally goes through the pooler once linked; if it does not, apply from your machine as before.
- The Edge Function is still deployed by hand (`npx supabase functions deploy admin-create-user`).

### nginx and TLS

Assumes Debian/Ubuntu, a domain you control and the folder from "Server, once".

1. **DNS.** An `A` record (and `AAAA` if the server has IPv6) for `catalog.example.com` pointing at the VPS. Wait until `dig +short catalog.example.com` shows it.
2. **Packages and firewall.**

   ```bash
   sudo apt update && sudo apt install -y nginx
   sudo ufw allow 'Nginx Full'   # 80 and 443 (and keep your SSH rule)
   ```

3. **Folder permissions.** nginx (`www-data`) must be able to walk into the folder and read the files:

   ```bash
   sudo chmod 755 /var/www /var/www/mission-catalog
   ```

4. **The site, first on port 80 only.** `/etc/nginx/sites-available/mission-catalog`:

   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name catalog.example.com;

       root /var/www/mission-catalog/current;
       index index.html;

       # Hashed files never change: cache them for good. The page itself is re-read to see a new release.
       location /assets/ {
           add_header Cache-Control "public, max-age=31536000, immutable";
       }
       location = /index.html {
           add_header Cache-Control "no-cache";
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/mission-catalog /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

   The app routes with `#`: there is no rewrite to configure. `root` follows the `current` link, so a deploy needs no reload. Another site on the same VPS only needs its own `server_name` and folder. Until the first deploy `current` does not exist and nginx answers 404 or 403: that is expected.

5. **The certificate (Let's Encrypt).**

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d catalog.example.com --redirect -m you@example.com --agree-tos
   ```

   certbot adds the `listen 443 ssl` block and the certificate paths to that same file, and redirects port 80 to 443. It installs a systemd timer that renews by itself: check it with `systemctl list-timers | grep certbot` and `sudo certbot renew --dry-run`.

6. **Optional hardening**, inside the 443 `server` block certbot wrote:

   ```nginx
   add_header Strict-Transport-Security "max-age=31536000" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```

   `add_header` inside a `location` replaces the ones of the `server`: repeat them there if you want them on `/assets/` too. Do not add a `Content-Security-Policy` without testing: the app talks to Supabase and loads map tiles.

7. **Check.** `curl -I https://catalog.example.com` answers `200` after the first deploy, and `sudo nginx -T | grep -n "server_name"` lists every site the server knows.

If the site lives under a sub-path (`/catalog/`), set `base` in `vite.config.ts` first and use `alias` instead of `root`.
