-- Protected workflows. RPCs use auth.uid(), never caller-supplied actor/owner IDs.
create function public.update_my_profile(p_name text,p_phone text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_active_user() then raise exception 'Unauthorized'; end if;
 if length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'Invalid name'; end if;
 update public.profiles set full_name=trim(p_name),phone=nullif(trim(coalesce(p_phone,'')),'') where id=auth.uid();
end $$;
create function public.submit_business(p_business uuid)
returns void language plpgsql security definer set search_path='' as $$
declare b public.businesses%rowtype;
begin
 if not public.is_owner() then raise exception 'Business owner role required'; end if;
 select * into b from public.businesses where id=p_business for update;
 if not found or b.owner_id<>auth.uid() or b.status not in ('draft','rejected') then raise exception 'Business not eligible for submission'; end if;
 update public.businesses set status='pending',submitted_at=now(),approved_at=null where id=p_business;
 insert into public.audit_logs(actor_id,action,target_type,target_id) values(auth.uid(),'business_submitted','business',p_business);
 insert into public.activity_events(user_id,business_id,event_type) values(auth.uid(),p_business,'business_submitted');
end $$;
create function public.review_business(p_business uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare b public.businesses%rowtype; d public.business_status;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 select * into b from public.businesses where id=p_business for update;
 if not found or b.status<>'pending' then raise exception 'Business is not pending'; end if;
 d:=case when p_approve then 'approved'::public.business_status else 'rejected'::public.business_status end;
 update public.businesses set status=d,approved_at=case when p_approve then now() else null end where id=p_business;
 insert into public.business_reviews(business_id,reviewer_id,decision,remarks) values(p_business,auth.uid(),d,coalesce(p_note,''));
 insert into public.audit_logs(actor_id,action,target_type,target_id,details) values(auth.uid(),'business_'||d,'business',p_business,jsonb_build_object('note',coalesce(p_note,'')));
 insert into public.activity_events(user_id,business_id,event_type) values(auth.uid(),p_business,'business_'||d);
end $$;
create function public.review_owner_request(p_request uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare r public.owner_requests%rowtype; d public.request_status;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 select * into r from public.owner_requests where id=p_request for update;
 if not found or r.status<>'pending' then raise exception 'Request is not pending'; end if;
 d:=case when p_approve then 'approved'::public.request_status else 'rejected'::public.request_status end;
 update public.owner_requests set status=d,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where id=p_request;
 if p_approve then update public.profiles set role='business_owner' where id=r.user_id and role='customer'; end if;
 insert into public.audit_logs(actor_id,action,target_type,target_id,details) values(auth.uid(),'owner_request_'||d,'owner_request',p_request,jsonb_build_object('user_id',r.user_id));
end $$;
create function public.record_business_view(p_business uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_active_user() then raise exception 'Login required'; end if;
 if not exists(select 1 from public.businesses where id=p_business and status='approved') then raise exception 'Business unavailable'; end if;
 -- Prevent repeated refreshes from generating unlimited views for the same user/business in one hour.
 if not exists(select 1 from public.activity_events where user_id=auth.uid() and business_id=p_business and event_type='business_view' and created_at>now()-interval '1 hour') then
  insert into public.activity_events(user_id,business_id,event_type) values(auth.uid(),p_business,'business_view');
 end if;
end $$;
create function public.record_search(p_query text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_active_user() then raise exception 'Login required'; end if;
 if length(trim(coalesce(p_query,''))) not between 2 and 100 then raise exception 'Invalid query'; end if;
 -- Do not store the raw query: retain only a countable event to reduce personal-data collection.
 insert into public.activity_events(user_id,event_type) values(auth.uid(),'business_search');
end $$;

revoke all on function public.update_my_profile(text,text),public.submit_business(uuid),public.review_business(uuid,boolean,text),public.review_owner_request(uuid,boolean,text),public.record_business_view(uuid),public.record_search(text) from public,anon;
grant execute on function public.update_my_profile(text,text),public.submit_business(uuid),public.review_business(uuid,boolean,text),public.review_owner_request(uuid,boolean,text),public.record_business_view(uuid),public.record_search(text) to authenticated;

-- Security-invoker views preserve underlying table RLS. Use only via admin-authorized backend.
create view public.admin_user_analytics with (security_invoker=true) as
select p.id,p.full_name,p.role,p.is_active,p.created_at,
 (select count(*) from public.businesses b where b.owner_id=p.id) as businesses_owned,
 (select count(*) from public.enquiries e where e.user_id=p.id) as enquiries_sent,
 (select count(*) from public.activity_events a where a.user_id=p.id) as recorded_events,
 (select max(a.created_at) from public.activity_events a where a.user_id=p.id) as last_recorded_activity
from public.profiles p;
create view public.admin_shop_analytics with (security_invoker=true) as
select b.id,b.name,b.owner_id,b.category_id,b.status,b.created_at,
 (select count(*) from public.activity_events a where a.business_id=b.id and a.event_type='business_view') as profile_views,
 (select count(*) from public.enquiries e where e.business_id=b.id) as enquiries,
 (select count(*) from public.saved_businesses s where s.business_id=b.id) as bookmarks
from public.businesses b;
revoke all on public.admin_user_analytics,public.admin_shop_analytics from public,anon,authenticated;
grant select on public.admin_user_analytics,public.admin_shop_analytics to service_role;
