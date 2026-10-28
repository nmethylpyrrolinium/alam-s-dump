# Security policy

## Reporting a vulnerability

Please report security concerns privately through GitHub's **Security → Report a vulnerability** flow when it is available. Do not open a public issue containing credentials, private user data, or an exploitable proof of concept.

Include the affected area, reproduction steps, likely impact, and any suggested mitigation. Maintainers should acknowledge a complete report before discussing a public disclosure timeline.

## Maintainer notes

## Public wall trust boundary

The frontend currently requests a moderation verdict, uploads the selected JPEG directly to the `wall-approved` Storage bucket, and then calls `submit_guest_wall_photo` with client-supplied filter metadata. A visitor can modify or bypass browser code, so neither the request order nor verdict fields are trustworthy. This repository does not contain the live bucket configuration, storage policies, RPC implementation, or moderation Edge Function source; inspect those in the connected Supabase project before relying on the wall's moderation guarantees.

The backend should deny public writes to the approved bucket and make a server-side function the only upload path. That function should validate actual file bytes and size, rate-limit submissions, call moderation itself, store unapproved content privately, and publish only after a server-controlled decision. The RPC should derive moderation state rather than accept authoritative status, score, or labels from a browser. Keep profile role changes restricted so users cannot set their own `account_type` to `admin`.

Alam’s Dump is a static browser application connected to Supabase-backed wall and moderation features. Browser-visible publishable keys are not privileged credentials; security must be enforced through Row Level Security, storage policies, narrowly scoped RPCs, and server-side moderation.

Never commit service-role keys, admin credentials, private tokens, or production `.env` files. If a privileged value is committed, revoke or rotate it immediately and then remove it from repository history as appropriate.
