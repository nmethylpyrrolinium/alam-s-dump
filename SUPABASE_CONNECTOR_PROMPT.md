# Supabase Connector Prompt — Alam’s Dump Live Wall

Paste the prompt below into ChatGPT with your Supabase connector enabled. Review the generated SQL before approving it.

```text
You are connected to my Supabase project for Alam’s Dump, a browser photo editor with a public, moderated “living wall.” Build the backend safely and idempotently. Do not expose the service-role key in client code. Explain every operation before running it, and ask me before destructive changes.

1. AUTHENTICATION
- Configure Supabase Auth for Google OAuth. Tell me the exact Google Cloud Console authorized JavaScript origin and redirect URI values I must add, and remind me to add my production URL and localhost URL to Supabase Auth URL Configuration.
- The frontend will call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- Create `public.profiles`: `id uuid primary key references auth.users(id) on delete cascade`, `display_name text`, `avatar_url text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- Create a secure trigger that inserts/updates a profile from Google user metadata (`full_name`, `avatar_url`) whenever a user is created.

2. LIVE WALL DATA
- Create enum `wall_status`: draft, pending, approved, rejected, archived.
- Create `public.wall_photos`: `id uuid primary key default gen_random_uuid()`, `owner_id uuid references profiles(id) on delete cascade not null`, `storage_path text unique not null`, `caption text check (char_length(caption) <= 160)`, `effect_recipe jsonb default '{}'::jsonb`, `status wall_status default 'pending'`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `approved_at timestamptz`.
- Create `public.wall_events` for live tracking: `id bigint generated always as identity primary key`, `wall_photo_id uuid references wall_photos(id) on delete cascade`, `actor_id uuid references profiles(id) on delete set null`, `event_type text check event_type in ('submitted','approved','rejected','viewed','downloaded','shared')`, `metadata jsonb default '{}'::jsonb`, `created_at timestamptz default now()`.
- Create `public.wall_reactions`: composite primary key `(wall_photo_id, user_id, emoji)`, with an allow-list of tasteful emoji and timestamps.
- Add useful indexes for wall status/created_at, owner_id, and wall_events photo/time queries.
- Add an `updated_at` trigger where appropriate.

3. STORAGE + SECURITY
- Create a private Storage bucket named `wall-originals` and a public bucket named `wall-approved` with a 10 MB limit and accepted MIME types image/jpeg, image/png, image/webp.
- Enable RLS on every public table. Policies must ensure: users can read/update their own profile; users can insert and read their own wall submissions; only approved wall photos are publicly readable; owners cannot self-approve or alter moderation fields; authenticated users may add/remove their own reactions; wall tracking events can be inserted only for the current user except system moderation events. Keep original uploads private to their owner and approved derivatives publicly readable.
- If moderator actions are needed, use a `moderator` custom claim or a private roles table; never trust a client-supplied role.

4. REALTIME + API CONTRACT
- Add `wall_photos`, `wall_events`, and `wall_reactions` to the Supabase Realtime publication, with RLS-safe subscriptions.
- Return the exact JavaScript needed to: initialize `window.supabaseClient`; perform Google login/logout; restore and display the session in the header; upload a processed JPEG using a collision-safe `${user.id}/${crypto.randomUUID()}.jpg` path; insert a pending wall_photos row; subscribe to approved wall photos and the signed-in user’s status changes; and unsubscribe on teardown.
- Include robust error handling, loading states, optimistic updates only where safe, and pagination for the public wall. Never use `select('*')` when a narrower projection works.

5. VERIFICATION
- Run non-destructive checks that show tables, policies, bucket settings, indexes, triggers, and Realtime publication membership.
- Provide a manual test checklist for two normal users, one anonymous visitor, and one moderator, covering attempts that RLS should reject.
- Summarize all changes and list any dashboard-only steps I still need to complete.
```

## Frontend hook already present

The login button checks for `window.supabaseClient` and calls Google OAuth when the client is available. Initialize it before `app.js`, or replace that global with your module import when you integrate the connector-generated client code.
