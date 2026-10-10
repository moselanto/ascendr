-- 0014: profile headline and current company
-- Shown on member profiles and used to strengthen introduction paths.
alter table profiles add column if not exists headline text;
alter table profiles add column if not exists company  text;

do $$ begin
  alter table profiles add constraint profiles_headline_len check (headline is null or char_length(headline) <= 120);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_company_len check (company is null or char_length(company) <= 80);
exception when duplicate_object then null; end $$;
