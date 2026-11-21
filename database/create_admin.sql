-- =====================================================================
-- Create or RESET the admin account.
-- Supabase -> SQL Editor -> edit the two values below -> Run.
--
--   * Pick a long password (14+ characters, mix of letters, numbers, symbols). Do NOT reuse one from elsewhere.
--   * "bf, 10" = slow password hashing on purpose (makes guessing expensive).
--   * Running it again with the same name simply changes that account's password.
--   * The last line signs out every open admin session (do this whenever you change the password
--     or suspect someone saw the admin link).
--   * Don't leave the real password saved in a file or chat afterwards.
-- =====================================================================
insert into public.admin_users (name, password_hash)
values ('PUT-ADMIN-NAME-HERE', extensions.crypt('PUT-A-LONG-STRONG-PASSWORD-HERE', extensions.gen_salt('bf', 10)))
on conflict (name) do update set password_hash = excluded.password_hash;

delete from public.admin_sessions;

-- Remove an old account (for example the previous temporary one):
--   delete from public.admin_users where name = 'old-name';
-- Unlock yourself right now if you locked the login by mistake (normally it frees itself after 30 minutes):
--   delete from public.admin_login_attempts;
