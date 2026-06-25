# Supabase Backend for KSM‑QM Assessment

## Overview

This folder contains a **minimal Supabase backend** that reproduces 100 % of the functionality of the original Google Apps Script implementation.

- **Database schema** (`supabase_schema.sql`) – tables for configuration, participants, questions, responses, and detailed answer rows.
- **Edge Function** (`edge_function.js`) – HTTP endpoint that Vercel frontend can call (`/api/...`). It implements the same actions as the GAS script: `getConfig`, `startSession`, `submitAssessment`, `getLeaderboard`, and admin utilities.
- **README** – quick‑start guide, how to import data, and how to run the function locally.

## How to use
1. **Create a Supabase project** (free tier) at https://supabase.com.
2. **Run the schema**: copy the contents of `supabase_schema.sql` into Supabase SQL editor → *Run*.
3. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy edge_function --project-ref <YOUR_PROJECT_REF>
   ```
   The function will be reachable at `https://<PROJECT_REF>.functions.supabase.co/edge_function`.
4. Update the Vercel frontend `fetch` URLs to point to the Supabase function URL.
5. Use the provided admin password (default `admin123`) or set a custom one in the `config` table.

## Next steps for you
- Add **POV (user/admin) roles** by extending the `participants` table with a `role` column (`user` / `admin`).
- Protect admin endpoints by checking the role before allowing imports or config changes.
- Optionally enable **Supabase Auth** so users log in with email before calling the API.

---
*All files are user‑facing artifacts; they can be edited directly in the project folder.*
