# GymPoint

A React + TypeScript gym-management platform backed by Supabase (Auth, PostgreSQL, and Row Level Security).

## Run locally

1. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon/publishable key:

   ```sh
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Install dependencies and start the dev server:

   ```sh
   npm install
   npm run dev
   ```

3. Build for production with `npm run build`.

## Company provisioning

Creating a company also creates its first administrator's Supabase Auth account. Deploy the Edge Function before using this feature:

```sh
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy create-company
```

The function uses Supabase's hosted `SUPABASE_SERVICE_ROLE_KEY` secret internally. Do not add that key to `.env.local` or any `VITE_` variable.

## Notes

- Never put a Supabase `service_role` key in any `VITE_` environment variable.
- User roles (`platform_admin`, `org_admin`, `manager`, `staff`) and organization isolation are enforced via Supabase Row Level Security in `public.profiles`.
