-- ============================================================
-- ONE-TIME: make sure at least one person can sign in.
-- Run this by hand in the Supabase SQL editor. It is NOT a migration.
--
-- Why: the temporary hardcoded login was removed. From now on only
-- emails registered under Management → Logins can get in, and only
-- someone who is already in can add others. If nobody has a row in
-- app_users yet, this adds the first one.
--
-- Before running:
--   1. Supabase dashboard → Authentication → Users → "Add user"
--      → enter the email and a strong password, tick "Auto confirm".
--   2. Replace the two values marked <<< below.
-- Safe to re-run (it does nothing if the person already has access).
-- ============================================================
insert into app_users (id, display_name, role)
select id, 'REPLACE WITH THEIR NAME', 'data'          -- <<< name (role 'data' = full access)
from auth.users
where lower(email) = lower('REPLACE-WITH-EMAIL@stayvista.com')   -- <<< email
on conflict (id) do nothing;

-- Check: this should now list the person.
select u.display_name, u.role, a.email
from app_users u join auth.users a on a.id = u.id;
