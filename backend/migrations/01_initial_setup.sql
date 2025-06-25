-- Enable pgvector extension
create extension if not exists vector;

-- Create tables
create table if not exists public.users (
    id uuid references auth.users primary key,
    email text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) not null,
    height_cm numeric,
    weight_kg numeric,
    age integer,
    activity_level text,
    dietary_restrictions text[],
    fitness_goal text,
    budget_weekly numeric,
    location text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.stores (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    location text not null,
    lat numeric,
    lng numeric,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can read own data" on public.users;
drop policy if exists "Users can update own data" on public.users;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Stores are viewable by all authenticated users" on public.stores;

-- Create policies
-- Users table policies
create policy "Users can read own data"
    on public.users
    for select
    using (auth.uid() = id);

create policy "Users can update own data"
    on public.users
    for update
    using (auth.uid() = id);

-- Profiles table policies
create policy "Users can read own profile"
    on public.profiles
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own profile"
    on public.profiles
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own profile"
    on public.profiles
    for update
    using (auth.uid() = user_id);

-- Stores table policies
create policy "Stores are viewable by all authenticated users"
    on public.stores
    for select
    using (auth.role() = 'authenticated');

-- Create function to handle profile updates
create or replace function public.handle_profile_update()
returns trigger
language plpgsql
security definer
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_profile_update on public.profiles;

-- Create trigger for profile updates
create trigger on_profile_update
    before update on public.profiles
    for each row
    execute function public.handle_profile_update(); 