-- RLS is enabled before exposing tables to the frontend.
do $$ declare t text; begin
 foreach t in array array['app_settings','profiles','owner_requests','locations','categories','businesses','business_reviews','enquiries','saved_businesses','activity_events','business_metrics','audit_logs'] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_active);
$$;
create function public.is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='business_owner' and is_active);
$$;
create function public.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active);
$$;
revoke all on function public.is_admin() from public,anon;
revoke all on function public.is_owner() from public,anon;
revoke all on function public.is_active_user() from public,anon;
grant execute on function public.is_admin(),public.is_owner(),public.is_active_user() to authenticated;

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_admin()));
-- Profile updates intentionally go through a narrow RPC, not arbitrary client UPDATE.
create policy settings_read on public.app_settings for select to anon,authenticated using(key in ('site_name','pilot_location','require_business_approval','allow_public_enquiries'));
create policy locations_read on public.locations for select to anon,authenticated using(true);
create policy categories_read on public.categories for select to anon,authenticated using(is_active or (select public.is_admin()));
create policy businesses_read on public.businesses for select to anon,authenticated using(status='approved' or owner_id=(select auth.uid()) or (select public.is_admin()));
create policy businesses_create on public.businesses for insert to authenticated with check(owner_id=(select auth.uid()) and (select public.is_owner()) and status='draft' and submitted_at is null and approved_at is null);
-- No direct UPDATE or DELETE policy for businesses: use RPC below for protected transitions.
create policy owner_requests_read on public.owner_requests for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy owner_requests_create on public.owner_requests for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and review_note is null and (select public.is_active_user()));
create policy reviews_read on public.business_reviews for select to authenticated using((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy enquiries_read on public.enquiries for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy enquiries_create on public.enquiries for insert to authenticated with check(user_id=(select auth.uid()) and status='open' and (select public.is_active_user()) and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved'));
create policy saved_read on public.saved_businesses for select to authenticated using(user_id=(select auth.uid()));
create policy saved_create on public.saved_businesses for insert to authenticated with check(user_id=(select auth.uid()) and (select public.is_active_user()) and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved'));
create policy saved_delete on public.saved_businesses for delete to authenticated using(user_id=(select auth.uid()));
create policy events_admin_read on public.activity_events for select to authenticated using((select public.is_admin()));
create policy metrics_read on public.business_metrics for select to authenticated using((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy audit_admin_read on public.audit_logs for select to authenticated using((select public.is_admin()));

-- Limit exposed table grants in addition to RLS. Trusted RPCs own privileged mutations.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.app_settings,public.locations,public.categories,public.businesses to anon;
grant select on public.app_settings,public.profiles,public.owner_requests,public.locations,public.categories,public.businesses,public.business_reviews,public.enquiries,public.saved_businesses,public.activity_events,public.business_metrics,public.audit_logs to authenticated;
grant insert on public.businesses,public.owner_requests,public.enquiries,public.saved_businesses to authenticated;
grant delete on public.saved_businesses to authenticated;
-- Identity sequence used for trusted writes only.
