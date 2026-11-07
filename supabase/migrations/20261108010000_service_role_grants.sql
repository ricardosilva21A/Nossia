-- The notifications job uses the service_role key, which skips row level security but still
-- needs table privileges. Projects don't always grant them by default, so grant them here.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
