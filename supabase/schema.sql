-- Lowkey Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  username text unique,
  avatar_url text,
  bio text,
  website_url text,
  twitter_handle text,
  plan text default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Companies table
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  logo_url text,
  description text,
  website_url text,
  twitter_url text,
  linkedin_url text,
  founded_year int,
  company_size text check (company_size in ('startup', 'mid', 'enterprise')),
  industry text,
  location text,
  created_at timestamptz default now() not null
);

-- Collections table
create table public.collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  is_public boolean default false,
  is_default boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Collection items table
create table public.collection_items (
  id uuid default uuid_generate_v4() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  video_slug text not null,
  note text,
  added_at timestamptz default now() not null,
  unique(collection_id, video_slug)
);

-- Indexes
create index profiles_username_idx on public.profiles(username);
create index companies_slug_idx on public.companies(slug);
create index collections_user_id_idx on public.collections(user_id);
create index collection_items_collection_id_idx on public.collection_items(collection_id);
create index collection_items_video_slug_idx on public.collection_items(video_slug);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Companies policies (public read, admin write)
create policy "Companies are viewable by everyone"
  on public.companies for select
  using (true);

-- Collections policies
create policy "Public collections are viewable by everyone"
  on public.collections for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can create own collections"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own collections"
  on public.collections for update
  using (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.collections for delete
  using (auth.uid() = user_id);

-- Collection items policies
create policy "Collection items viewable if collection is accessible"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections
      where id = collection_id
      and (is_public = true or user_id = auth.uid())
    )
  );

create policy "Users can add items to own collections"
  on public.collection_items for insert
  with check (
    exists (
      select 1 from public.collections
      where id = collection_id and user_id = auth.uid()
    )
  );

create policy "Users can remove items from own collections"
  on public.collection_items for delete
  using (
    exists (
      select 1 from public.collections
      where id = collection_id and user_id = auth.uid()
    )
  );

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create default "Saved" collection for new user
  insert into public.collections (user_id, name, description, is_default)
  values (new.id, 'Saved', 'Your saved videos', true);

  return new;
end;
$$;

-- Trigger to create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger collections_updated_at
  before update on public.collections
  for each row execute procedure public.update_updated_at();
