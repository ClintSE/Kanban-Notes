This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Kanban Notes - local setup

This project includes a simple draggable kanban board and a theme color that is persisted to Supabase.

1. Install dependencies:

```powershell
npm install
```

2. Add a `.env.local` with your Supabase values:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Recommended simple database schema:

- Table `settings` with columns `key text PRIMARY KEY`, `value text`.

Optional tables for full persistence:

- `columns` (id text PRIMARY KEY, title text, position int)
- `cards` (id text PRIMARY KEY, title text, description text, column_id text, position int)

Run the dev server with `npm run dev`. The UI currently uses in-memory sample cards; you can extend `src/components/Board.tsx` to fetch/persist cards and columns.

## Supabase Auth (Google) setup

To enable Sign in with Google in this app:

1. In the Supabase dashboard, go to Authentication > Providers and enable Google. Add your OAuth Client ID and Client Secret.

2. In the same settings, add the redirect URL (for local development):

```
http://localhost:3000
```

3. Ensure your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`.

4. (Optional but recommended) Enable Row Level Security (RLS) and apply the example policies in `supabase/migrations/001_init_and_rls.sql` to scope settings and cards to the authenticated user. When RLS is enabled, make sure your policies allow the anon key to create users or sign in via OAuth.

5. In the app header you'll see a "Sign in with Google" button after enabling the provider. Signing in will scope cards and settings to your user.
