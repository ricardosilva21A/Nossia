-- Where an idea came from: the post or place someone shared into the app.
alter table public.ideas
  add column if not exists source_url text check (source_url is null or (source_url ~ '^https?://' and length(source_url) <= 2048));
