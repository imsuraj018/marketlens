# MarketLens — full website MVP

This is a **working-code starter**, not a deployed website. It uses React/TypeScript/Vite and Supabase Auth + PostgreSQL + RLS + narrowly scoped RPCs. The existing `202610250001`–`004` migrations are copied unchanged from the earlier database starter, and `005_application.sql` adds only new application workflows. No demo stores or invented revenue are inserted.

## 1. Requirements
Node 20.19+ (or a supported newer LTS), npm, Supabase project, Supabase CLI (`npx supabase`).

## 2. Database (empty project)
```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```
**If you already pushed migrations 001–004 from the earlier ZIP**, copy only `202610250005_application.sql` into that same existing migration directory and run `db push` from the original linked project; do not apply the original migrations a second time or reset a production database. Compare migration history first: `npx supabase migration list`.

## 3. Configure the frontend
Copy `.env.example` to `.env.local` and set the Supabase project URL and **publishable** key. Never use the secret/service-role key in the frontend. In Supabase Authentication, enable Email and configure Site URL `http://localhost:5173`, plus redirect URLs as needed. If email confirmation is enabled, verify the email before login.

```bash
npm run dev
```
Open http://localhost:5173. `npm run build` type-checks and builds the frontend.

## 4. First admin account
Register normally, confirm email, copy your UUID from Authentication → Users, then run **once** in the trusted SQL editor:
```sql
update public.profiles set role='admin' where id='YOUR_AUTH_USER_UUID'::uuid;
```
Refresh your session. Admin roles are never selected from the registration form. To assign an analyst role, use a similarly trusted administrator-only SQL operation; do not expose role updates through the browser.

## 5. End-to-end smoke test
1. Register Customer A and sign in. Dashboard → request owner access.
2. Sign in as admin in another browser; approve owner request.
3. Refresh Customer A session; open Owner studio, create draft, submit.
4. Admin approves pending business. The listing appears in public Explore stores.
5. Customer B signs in, opens listing, saves it and sends enquiry.
6. Owner sees enquiry, updates its status and optionally records owner-reported monthly metrics.
7. Admin dashboard shows account-level and shop-level counts and approvals.

## 6. Customization
- **Appearance:** light/dark and accent color controls in header, stored in browser localStorage.
- **Site name/locality:** admin settings backed by `app_settings`. Refresh to apply brand changes.
- **Categories/localities:** edit `004_seed.sql` **before first deployment**; after deployment, create a new migration for additions. Never rewrite deployed migrations.
- **Homepage and text:** `src/App.tsx` → `Home`.
- **Design tokens:** `src/style.css` → `:root` and `[data-theme=dark]`.
- **Analytics:** `admin_user_report`, `admin_shop_report` enforce admin privileges; raw data is never exposed to ordinary customers.

## 7. Architecture and caveats
- Supabase Auth stores passwords. `public.profiles` stores role and public account metadata.
- RLS blocks unapproved businesses from public reads and prevents self-assigning privileged roles.
- Business submissions, approvals, edits, reporting and enquiry status changes use security-definer RPCs that check `auth.uid()` and role.
- `record_business_view` counts one signed-in user's view per business per hour. Anonymous visitor analytics are not implemented. Searches record a count event, not raw query text.
- Financial reports are owner-reported and **not audited**. Estimator values are illustrative.
- Admin views are revoked from browser roles; admin-only RPCs expose the report after permission checks.
- Analyst workspace currently provides the public model and an explanatory access boundary; a dedicated aggregated, privacy-preserving analyst reporting API is a future extension.
- This MVP does not include payment processing, email delivery, map geocoding, media uploads, user suspension UI, exports, production rate limiting, or legal compliance review. Add those before claiming a production-ready commercial launch.
- For deployment configure verified domains, HTTPS, Supabase Auth URLs, SMTP, monitoring, backups, retention and a privacy notice. RLS is essential but is not a substitute for penetration testing.

## 8. Database validation
```sql
select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename;
select version from supabase_migrations.schema_migrations order by version;
```
All 12 application tables must show `rowsecurity=true`. Supabase Auth tables are managed separately.
