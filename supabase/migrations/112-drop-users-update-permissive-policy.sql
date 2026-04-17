-- R1 Critical fix from 2026-04-17 midday comprehensive audit.
--
-- users.users_update was a permissive UPDATE policy with USING (true),
-- no WITH CHECK, role=public. OR-merged with users_write (admin-only) and
-- won, letting any authenticated Google-OAuth employee run
--   UPDATE users SET role='admin', super_admin=true, is_admin=true
-- on their own row (or any other user's) via one Supabase REST call, then
-- refresh their session to gain admin.
--
-- Only client-side call site to public.users is components/admin/UsersManager.tsx
-- rendered from admin-only /admin page; that write still passes users_write
-- (USING auth_is_admin()). No server routes update public.users directly.

DROP POLICY IF EXISTS users_update ON public.users;
