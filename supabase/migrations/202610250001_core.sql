-- MarketLens 001: core schema. Apply ONCE through Supabase CLI migrations.
create extension if not exists pgcrypto;
create type public.app_role as enum ('customer','business_owner','analyst','admin');
create type public.business_status as enum ('draft','pending','approved','rejected','suspended');
create type public.request_status as enum ('pending','approved','rejected');
create type public.enquiry_status as enum ('open','in_progress','resolved','closed');
create type public.metric_source as enum ('owner_reported','survey','model_estimate');

create table public.app_settings (
 key text primary key,
 value jsonb not null,
 description text not null default '',
 updated_at timestamptz not null default now()
);
insert into public.app_settings(key,value,description) values
 ('site_name','"MarketLens"','Public brand name'),
 ('pilot_location','"Sant Tukaram Nagar, Pimpri, Pune"','Initial market'),
 ('require_business_approval','true','Always require admin approval'),
 ('allow_public_enquiries','false','MVP requires customer login'),
 ('analytics_retention_days','180','Retention policy; deletion job must be scheduled separately');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role public.app_role not null default 'customer',
 phone text,
 avatar_url text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.owner_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(length(trim(reason)) between 10 and 2000),
 status public.request_status not null default 'pending',
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now()
);
create unique index one_pending_owner_request on public.owner_requests(user_id) where status='pending';
create table public.locations (
 id uuid primary key default gen_random_uuid(),
 name text not null, city text not null, state text not null,
 country text not null default 'India',
 latitude numeric(10,7), longitude numeric(10,7),
 unique(name,city,state)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique, slug text not null unique,
 description text not null default '', is_active boolean not null default true
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 category_id uuid not null references public.categories(id),
 location_id uuid not null references public.locations(id),
 name text not null check(length(trim(name)) between 2 and 150),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 description text not null default '',
 phone text, email text, address text,
 latitude numeric(10,7), longitude numeric(10,7),
 status public.business_status not null default 'draft',
 submitted_at timestamptz, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_public_idx on public.businesses(location_id,category_id,name) where status='approved';
create index businesses_pending_idx on public.businesses(submitted_at) where status='pending';
create table public.business_reviews (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 reviewer_id uuid not null references public.profiles(id),
 decision public.business_status not null check(decision in ('approved','rejected','suspended')),
 remarks text not null default '', reviewed_at timestamptz not null default now()
);
create index reviews_business_idx on public.business_reviews(business_id,reviewed_at desc);
create table public.enquiries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 business_id uuid not null references public.businesses(id),
 subject text not null check(length(trim(subject)) between 3 and 200),
 message text not null check(length(trim(message)) between 5 and 4000),
 status public.enquiry_status not null default 'open',
 created_at timestamptz not null default now()
);
create index enquiries_business_idx on public.enquiries(business_id,created_at desc);
create index enquiries_user_idx on public.enquiries(user_id,created_at desc);
create table public.saved_businesses (
 user_id uuid not null references public.profiles(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,business_id)
);
create table public.activity_events (
 id bigint generated always as identity primary key,
 user_id uuid references public.profiles(id) on delete set null,
 business_id uuid references public.businesses(id) on delete set null,
 event_type text not null check(event_type in ('business_view','business_search','enquiry_created','business_saved','business_submitted','business_approved','business_rejected')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index events_user_idx on public.activity_events(user_id,created_at desc);
create index events_business_idx on public.activity_events(business_id,created_at desc);
create table public.business_metrics (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 period_start date not null, period_end date not null,
 estimated_revenue numeric(14,2) check(estimated_revenue >= 0),
 reported_revenue numeric(14,2) check(reported_revenue >= 0),
 estimated_customers integer check(estimated_customers >= 0),
 source public.metric_source not null,
 assumptions jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 check(period_end >= period_start),
 check((source='owner_reported' and reported_revenue is not null and estimated_revenue is null) or (source<>'owner_reported' and reported_revenue is null))
);
create index metrics_business_idx on public.business_metrics(business_id,period_start desc);
create table public.audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null, target_type text not null, target_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index audit_time_idx on public.audit_logs(created_at desc);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
 return new;
end $$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_user();

-- Keep updated_at consistent.
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_businesses before update on public.businesses for each row execute function public.touch_updated_at();
