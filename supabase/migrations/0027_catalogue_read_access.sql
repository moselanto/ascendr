-- 0027: let the app read the skills catalogue
--
-- skills, role_profiles and role_required_skills (0011) hold the public ESCO
-- catalogue: role titles, skill names and which skills each role needs.
-- They were created without read policies. On projects where Supabase
-- enables row level security automatically, that leaves the catalogue
-- unreadable to signed-in members, so role pickers say "Run the skills
-- import first" and goals show "Not analysed yet" even after the import.
--
-- The catalogue contains no personal data, so anyone may read it.
-- Writes stay with the service role (the ESCO import).

alter table skills enable row level security;
alter table role_profiles enable row level security;
alter table role_required_skills enable row level security;

drop policy if exists "skills_read_all" on skills;
create policy "skills_read_all" on skills for select using (true);

drop policy if exists "role_profiles_read_all" on role_profiles;
create policy "role_profiles_read_all" on role_profiles for select using (true);

drop policy if exists "role_required_skills_read_all" on role_required_skills;
create policy "role_required_skills_read_all" on role_required_skills for select using (true);

grant select on skills, role_profiles, role_required_skills to anon, authenticated;
