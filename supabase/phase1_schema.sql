-- GymPoint Phase 1 database foundation
-- Run in Supabase Dashboard > SQL Editor as the project owner.
-- This script is non-destructive: it creates missing objects and does not delete data.

create extension if not exists pgcrypto;
create schema if not exists private;

create sequence if not exists public.organization_code_seq start 1001;
create sequence if not exists public.member_code_seq start 1001;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  org_code text unique not null default ('GYM-' || lpad(nextval('public.organization_code_seq')::text, 5, '0')),
  name text not null,
  logo_url text,
  contact_email text,
  phone text,
  primary_location text,
  admin_name text not null,
  admin_email text not null,
  plan text not null default 'Starter' check (plan in ('Starter', 'Growth', 'Scale')),
  status text not null default 'Trial' check (status in ('Active', 'Trial', 'Suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('platform_admin', 'org_admin', 'manager', 'staff', 'member')),
  organization_id uuid references public.organizations(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('Starter', 'Growth', 'Scale')),
  price_cents integer not null check (price_cents >= 0),
  caption text not null,
  included text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_cycle text not null default 'month' check (billing_cycle in ('month', 'year', 'one_time')),
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  home_branch_id uuid references public.branches(id) on delete set null,
  membership_plan_id uuid references public.membership_plans(id) on delete set null,
  member_code text not null unique default ('GP-' || lpad(nextval('public.member_code_seq')::text, 5, '0')),
  full_name text not null,
  email text,
  phone text,
  emergency_contact text,
  health_notes text,
  waiver_accepted_at timestamptz,
  plan_name text not null default 'Starter monthly',
  status text not null default 'Active' check (status in ('Active', 'Pending', 'Frozen', 'Expired', 'Cancelled')),
  avatar_color text not null default 'violet',
  joined_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('org_admin', 'manager', 'staff')),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Cancelled')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  member_id uuid references public.members(id) on delete set null,
  status text not null check (status in ('Checked in', 'Access denied')),
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Storage-ready billing records. The current UI does not yet create these records.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  invoice_number text not null,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'Open' check (status in ('Open', 'Paid', 'Void', 'Overdue')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('cash', 'bank_transfer', 'card', 'mobile_money', 'other')),
  recorded_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Bring earlier partial versions of these tables up to the columns used by the app.
alter table public.organizations add column if not exists org_code text;
alter table public.organizations add column if not exists admin_name text;
alter table public.organizations add column if not exists admin_email text;
alter table public.organizations add column if not exists contact_email text;
alter table public.organizations add column if not exists phone text;
alter table public.organizations add column if not exists primary_location text;
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists plan text not null default 'Starter';
alter table public.organizations add column if not exists status text not null default 'Trial';
alter table public.organizations add column if not exists created_at timestamptz not null default now();
alter table public.organizations alter column org_code set default ('GYM-' || lpad(nextval('public.organization_code_seq')::text, 5, '0'));

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'staff';
alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.profiles add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.members add column if not exists member_code text;
alter table public.members add column if not exists membership_plan_id uuid references public.membership_plans(id) on delete set null;
alter table public.members add column if not exists plan_name text not null default 'Starter monthly';
alter table public.members add column if not exists avatar_color text not null default 'violet';
alter table public.members add column if not exists joined_at timestamptz not null default now();
alter table public.members add column if not exists expires_at timestamptz;
alter table public.members add column if not exists emergency_contact text;
alter table public.members add column if not exists health_notes text;
alter table public.members add column if not exists waiver_accepted_at timestamptz;
alter table public.members add column if not exists freeze_reason text;
alter table public.members add column if not exists cancellation_reason text;
alter table public.members add column if not exists discount_code text;
alter table public.members alter column member_code set default ('GP-' || lpad(nextval('public.member_code_seq')::text, 5, '0'));

alter table public.membership_plans add column if not exists branch_access text not null default 'all';

-- Approval requests for freezes, cancellations, refunds, and discounts
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null check (request_type in ('Freeze Membership', 'Cancel Membership', 'Refund', 'Discount')),
  member_name text not null,
  requested_by text not null,
  details text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.approval_requests enable row level security;
drop policy if exists "approval_requests access" on public.approval_requests;
drop policy if exists "approval_requests manage" on public.approval_requests;
create policy "approval_requests access" on public.approval_requests for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "approval_requests manage" on public.approval_requests for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));


update public.organizations
set org_code = 'GYM-' || lpad(nextval('public.organization_code_seq')::text, 5, '0')
where org_code is null;

update public.members
set member_code = 'GP-' || lpad(nextval('public.member_code_seq')::text, 5, '0')
where member_code is null;

create unique index if not exists organizations_org_code_key on public.organizations(org_code);
create unique index if not exists members_member_code_key on public.members(member_code);

create index if not exists branches_organization_id_idx on public.branches(organization_id);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists members_organization_id_idx on public.members(organization_id);
create index if not exists members_lookup_idx on public.members(organization_id, member_code, email);
create index if not exists check_ins_organization_time_idx on public.check_ins(organization_id, checked_in_at desc);

-- Authorization helpers. Security-definer functions keep RLS checks safe and avoid policy recursion.
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'platform_admin'
  );
$$;

create or replace function private.can_access_organization(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_platform_admin()) or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.organization_id = target_organization_id
  );
$$;

create or replace function private.can_manage_organization(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_platform_admin()) or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = target_organization_id
      and p.role in ('org_admin', 'manager')
  );
$$;

revoke all on function private.is_platform_admin() from public;
revoke all on function private.can_access_organization(uuid) from public;
revoke all on function private.can_manage_organization(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.can_access_organization(uuid) to authenticated;
grant execute on function private.can_manage_organization(uuid) to authenticated;

-- Required API grants. RLS policies below still decide which rows each signed-in user can reach.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_plans enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.team_invites enable row level security;
alter table public.check_ins enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_platform_admin()) or (select private.can_access_organization(organization_id)));

drop policy if exists "organizations select" on public.organizations;
drop policy if exists "organizations manage" on public.organizations;
create policy "organizations select" on public.organizations for select to authenticated
  using ((select private.can_access_organization(id)));
create policy "organizations manage" on public.organizations for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

drop policy if exists "branches access" on public.branches;
drop policy if exists "branches manage" on public.branches;
create policy "branches access" on public.branches for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "branches manage" on public.branches for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists "platform plans access" on public.platform_plans;
create policy "platform plans access" on public.platform_plans for select to authenticated using (true);

drop policy if exists "membership plans access" on public.membership_plans;
drop policy if exists "membership plans manage" on public.membership_plans;
create policy "membership plans access" on public.membership_plans for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "membership plans manage" on public.membership_plans for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists "members access" on public.members;
drop policy if exists "members manage" on public.members;
create policy "members access" on public.members for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "members manage" on public.members for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists "invites access" on public.team_invites;
drop policy if exists "invites manage" on public.team_invites;
create policy "invites access" on public.team_invites for select to authenticated
  using ((select private.can_manage_organization(organization_id)));
create policy "invites manage" on public.team_invites for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists "check ins access" on public.check_ins;
create policy "check ins access" on public.check_ins for select to authenticated
  using ((select private.can_access_organization(organization_id)));

drop policy if exists "invoices access" on public.invoices;
drop policy if exists "invoices manage" on public.invoices;
create policy "invoices access" on public.invoices for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "invoices manage" on public.invoices for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists "payments access" on public.payments;
drop policy if exists "payments manage" on public.payments;
create policy "payments access" on public.payments for select to authenticated
  using ((select private.can_access_organization(organization_id)));
create policy "payments manage" on public.payments for all to authenticated
  using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

-- Check-in uses a controlled server-side operation so members from another gym cannot be queried.
create or replace function public.record_check_in(
  p_organization_id uuid,
  p_branch_id uuid,
  p_lookup text
)
returns table (check_in_id uuid, member_name text, member_status text, check_in_status text)
language plpgsql security definer set search_path = '' as $$
declare
  target_member public.members;
  new_check_in_id uuid;
  result_status text;
begin
  if not private.can_access_organization(p_organization_id) then
    raise exception 'You do not have access to this organization.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.branches b where b.id = p_branch_id and b.organization_id = p_organization_id and b.is_open) then
    raise exception 'The selected branch is unavailable.' using errcode = '22023';
  end if;

  select m.* into target_member
  from public.members m
  where m.organization_id = p_organization_id
    and (m.member_code = p_lookup or lower(m.email) = lower(p_lookup) or lower(m.full_name) = lower(p_lookup))
  limit 1;

  if not found then
    return;
  end if;

  result_status := case
    when target_member.status = 'Active' and (target_member.expires_at is null or target_member.expires_at >= current_date) then 'Checked in'
    else 'Access denied'
  end;

  insert into public.check_ins (organization_id, branch_id, member_id, status)
  values (p_organization_id, p_branch_id, target_member.id, result_status)
  returning id into new_check_in_id;

  return query select new_check_in_id, target_member.full_name, target_member.status, result_status;
end;
$$;
grant execute on function public.record_check_in(uuid, uuid, text) to authenticated;

-- Subscription tiers shown by the platform-administrator dashboard.
insert into public.platform_plans (name, price_cents, caption, included) values
  ('Starter', 4900, 'For independent studios', '1 branch · Up to 250 members'),
  ('Growth', 12900, 'For growing gym teams', 'Up to 5 branches · 1,500 members'),
  ('Scale', 29900, 'For multi-location brands', 'Unlimited branches · 5,000 members')
on conflict (name) do update set
  price_cents = excluded.price_cents,
  caption = excluded.caption,
  included = excluded.included;

-- Give the existing platform owner the database role that the Edge Function checks.
insert into public.profiles (id, email, full_name, role)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', 'Aman'), 'platform_admin'
from auth.users
where lower(email) = 'aman@gmail.com'
on conflict (id) do update set role = 'platform_admin', email = excluded.email;


-- ==============================================================================
-- PROFILE AVATAR MIGRATION
-- ==============================================================================
alter table public.profiles add column if not exists avatar_url text;
