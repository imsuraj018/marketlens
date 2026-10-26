-- Additions to the original MarketLens starter; do not rerun previous migrations.
-- Narrow trusted mutations, each independently checks auth.uid() and role.
create function public.save_business_draft(p_business uuid,p_name text,p_category uuid,p_location uuid,p_description text,p_phone text,p_email text,p_address text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not public.is_owner() then raise exception 'Business owner role required'; end if;
 if length(trim(coalesce(p_name,''))) not between 2 and 150 then raise exception 'Invalid business name'; end if;
 if p_business is null then
  insert into public.businesses(owner_id,category_id,location_id,name,slug,description,phone,email,address)
  values(auth.uid(),p_category,p_location,trim(p_name),lower(trim(both '-' from regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g')))||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),coalesce(p_description,''),p_phone,p_email,p_address)
  returning id into v_id;
 else
  update public.businesses set name=trim(p_name),category_id=p_category,location_id=p_location,description=coalesce(p_description,''),phone=p_phone,email=p_email,address=p_address
  where id=p_business and owner_id=auth.uid() and status in ('draft','rejected') returning id into v_id;
  if v_id is null then raise exception 'Listing cannot be edited'; end if;
 end if;
 return v_id;
end $$;
create function public.set_enquiry_status(p_enquiry uuid,p_status public.enquiry_status)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_user() then raise exception 'Not permitted'; end if;
 update public.enquiries e set status=p_status where e.id=p_enquiry and (public.is_admin() or exists(select 1 from public.businesses b where b.id=e.business_id and b.owner_id=auth.uid()));
 if not found then raise exception 'Enquiry unavailable'; end if;
end $$;
create function public.add_owner_metric(p_business uuid,p_start date,p_end date,p_revenue numeric,p_customers integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_user() or not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and status='approved') then raise exception 'Not your approved business'; end if;
 if p_start is null or p_end<p_start or p_end>current_date or p_revenue is null or p_revenue<0 or p_customers<0 then raise exception 'Invalid reporting period or values'; end if;
 insert into public.business_metrics(business_id,period_start,period_end,reported_revenue,estimated_customers,source) values(p_business,p_start,p_end,p_revenue,p_customers,'owner_reported');
end $$;
create function public.record_bookmark(p_business uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_user() or not exists(select 1 from public.saved_businesses where user_id=auth.uid() and business_id=p_business) then raise exception 'Bookmark unavailable'; end if;
 insert into public.activity_events(user_id,business_id,event_type) values(auth.uid(),p_business,'business_saved');
end $$;
create function public.record_enquiry(p_enquiry uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_business uuid;
begin
 select business_id into v_business from public.enquiries where id=p_enquiry and user_id=auth.uid();
 if v_business is null then raise exception 'Enquiry unavailable'; end if;
 insert into public.activity_events(user_id,business_id,event_type) values(auth.uid(),v_business,'enquiry_created');
end $$;
create function public.admin_set_setting(p_key text,p_value jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 if p_key not in ('site_name','pilot_location','allow_public_enquiries') then raise exception 'Setting is not editable'; end if;
 if p_key in ('site_name','pilot_location') and (jsonb_typeof(p_value)<>'string' or length(trim(p_value #>> '{}')) not between 2 and 100) then raise exception 'Invalid value'; end if;
 if p_key='allow_public_enquiries' and jsonb_typeof(p_value)<>'boolean' then raise exception 'Invalid value'; end if;
 update public.app_settings set value=p_value,updated_at=now() where key=p_key;
 insert into public.audit_logs(actor_id,action,target_type,details) values(auth.uid(),'setting_updated','setting',jsonb_build_object('key',p_key));
end $$;
revoke all on function public.save_business_draft(uuid,text,uuid,uuid,text,text,text,text),public.set_enquiry_status(uuid,public.enquiry_status),public.add_owner_metric(uuid,date,date,numeric,integer),public.record_bookmark(uuid),public.record_enquiry(uuid),public.admin_set_setting(text,jsonb) from public,anon;
grant execute on function public.save_business_draft(uuid,text,uuid,uuid,text,text,text,text),public.set_enquiry_status(uuid,public.enquiry_status),public.add_owner_metric(uuid,date,date,numeric,integer),public.record_bookmark(uuid),public.record_enquiry(uuid),public.admin_set_setting(text,jsonb) to authenticated;
-- Admin dashboard RPCs: do not expose raw analytics views to clients.
create function public.admin_user_report() returns table(id uuid,full_name text,role public.app_role,is_active boolean,created_at timestamptz,businesses_owned bigint,enquiries_sent bigint,recorded_events bigint,last_recorded_activity timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 return query select v.* from public.admin_user_analytics v;
end $$;
create function public.admin_shop_report() returns table(id uuid,name text,owner_id uuid,category_id uuid,status public.business_status,created_at timestamptz,profile_views bigint,enquiries bigint,bookmarks bigint)
language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 return query select v.* from public.admin_shop_analytics v;
end $$;
revoke all on function public.admin_user_report(),public.admin_shop_report() from public,anon;
grant execute on function public.admin_user_report(),public.admin_shop_report() to authenticated;
-- Prevent arbitrary account metadata updates via direct client writes.
