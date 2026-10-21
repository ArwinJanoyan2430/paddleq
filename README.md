# React + Vite

## Supabase setup

The app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when present. A publishable key is safe for browser use only when Row Level Security policies are configured. Copy `.env.example` to `.env.local` for local overrides.

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). Re-run it after pulling changes; it installs the transactional match RPCs and session deletion cascades used by Session History.
2. Ensure Realtime is enabled for the `sessions`, `players`, and `matches` tables (the SQL adds them to the default publication).
3. The app's demo login accepts username `admin` and password `admin` locally; it does not use Supabase Auth or an Edge Function.

The starter policies permit anonymous table access for this demo login. Anyone with the app and public key can access the data, so replace them with authenticated, user-scoped policies before using real/private data or deploying publicly.

The demo schema grants anonymous access to the app tables so the local `admin` / `admin` demo gate can use Supabase without an Auth session. For multi-club or public use, replace these permissive grants and policies with authenticated, user-scoped access.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
