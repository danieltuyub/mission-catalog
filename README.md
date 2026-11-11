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
