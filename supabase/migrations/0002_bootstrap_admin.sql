-- Run ONCE before your first sign-in. Replace the email with the one you will log in with.
-- That user becomes the first (Admin, Active) account; everyone else starts Inactive.
insert into private.bootstrap_admins (email) values ('CHANGE_ME@example.com')
on conflict do nothing;
