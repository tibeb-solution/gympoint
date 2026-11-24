# GymFlow

A React + TypeScript gym-management UI prototype. All records are demo data stored in this browser's `localStorage`; there is no backend or Supabase connection. The sign-in and platform-admin screens are client-side demos, not secure authentication. Do not enter real member or health information.

## Run locally

```sh
npm install
npm run dev
```

Sign in to the local platform-admin demo with:

- Email: `aman@gmai.com`
- Password: `aman1234`

The admin portal can create company workspaces; these are saved to this browser only. Use **Preview gym workspace** to return to the gym dashboard. The organization screens are UI previews for the later backend phase.

Build for production with `npm run build`.
