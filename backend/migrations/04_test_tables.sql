-- Create test tables
create table if not exists public.test_setup (
    id serial primary key,
    name text not null
);

create table if not exists public.test_vectors (
    id serial primary key,
    embedding vector(3)
);

-- Enable RLS
alter table public.test_setup enable row level security;
alter table public.test_vectors enable row level security;

-- Allow all operations for testing
create policy "Allow all operations on test tables"
    on public.test_setup
    for all
    using (true)
    with check (true);

create policy "Allow all operations on test vectors"
    on public.test_vectors
    for all
    using (true)
    with check (true); 