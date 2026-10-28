-- Hybrid AutoCommerce catalogue. Review against live schema before applying.
create table if not exists public.ac_product_templates (
 sku text primary key,
 name text not null,
 category text not null,
 description text not null default '',
 brand text,
 is_active boolean not null default true
);
insert into public.ac_product_templates(sku,name,category,description) values
('ACD-INT-001','Premium Seat Covers','Interior','Leatherette-style seat cover set; confirm vehicle fitment'),
('ACD-INT-002','7D Floor Mats','Interior','All-weather floor mats; confirm vehicle fitment'),
('ACD-INT-003','Steering Wheel Cover','Interior','Comfort-grip steering wheel cover'),
('ACD-INT-004','Dashboard Mat','Interior','Anti-slip dashboard protection'),
('ACD-INT-005','Neck Cushion Set','Interior','Comfort cushions for car seats'),
('ACD-LGT-001','LED Headlights','Lighting','Headlight set; check socket and vehicle compatibility'),
('ACD-LGT-002','Fog Lamp Set','Lighting','Fog lamp set; check fitment and local road regulations'),
('ACD-LGT-003','Projector Lamps','Lighting','Projector lamp upgrade; professional fitment recommended'),
('ACD-LGT-004','DRL Light Set','Lighting','Daytime running light set'),
('ACD-LGT-005','Ambient Light Kit','Lighting','Interior ambient LED lighting'),
('ACD-ELC-001','Reverse Camera','Electronics','Reverse parking camera'),
('ACD-ELC-002','Android Infotainment','Electronics','Dashboard multimedia unit; confirm vehicle compatibility'),
('ACD-ELC-003','Dashcam','Electronics','Front-facing driving recorder'),
('ACD-ELC-004','Parking Sensors','Electronics','Reverse parking sensor kit'),
('ACD-ELC-005','Car Speaker Set','Electronics','Replacement car speaker set'),
('ACD-EXT-001','Door Visors','Exterior','Window rain visors; confirm vehicle model'),
('ACD-EXT-002','Mud Flaps','Exterior','Protective mud flap set'),
('ACD-EXT-003','Car Cover','Exterior','Protective car cover; select vehicle size'),
('ACD-CARE-001','Microfiber Cleaning Kit','Care','Interior and exterior cleaning cloth kit'),
('ACD-CARE-002','Car Polish','Care','Car surface polish; follow product instructions'),
('ACD-CARE-003','Car Vacuum Cleaner','Care','Compact vehicle interior vacuum')
on conflict (sku) do nothing;

create table if not exists public.ac_products (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 sku text not null,
 name text not null,
 description text,
 category text not null,
 brand text,
 image_url text,
 hsn_code text,
 gst_rate numeric,
 retail_price numeric not null default 0 check(retail_price >= 0),
 wholesale_reference_price numeric check(wholesale_reference_price >= 0),
 is_published boolean not null default false,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(business_id,sku)
);
-- Existing installations may already have this table; guarantee SKU uniqueness.
create unique index if not exists ac_products_business_sku_unique on public.ac_products(business_id,sku);
-- Existing products with custom SKUs must be reconciled before enforcing the FK.
-- The trigger enforces that every newly created listing uses an approved template.
create or replace function public.ac_validate_template() returns trigger
language plpgsql security invoker set search_path='' as $$
declare t public.ac_product_templates%rowtype;
begin
 select * into t from public.ac_product_templates where sku=new.sku and is_active;
 if not found then raise exception 'Select an active predefined catalogue product'; end if;
 if tg_op='UPDATE' and (new.sku is distinct from old.sku or new.business_id is distinct from old.business_id) then
   raise exception 'SKU and business cannot be changed';
 end if;
 new.name=t.name; new.category=t.category;
 return new;
end $$;
drop trigger if exists ac_product_template_guard on public.ac_products;
create trigger ac_product_template_guard before insert or update on public.ac_products
for each row execute function public.ac_validate_template();

-- Seed drafts, not fabricated prices or stock. Owners publish only after filling details.
insert into public.ac_products(business_id,sku,name,description,category,brand,retail_price,is_published,is_active)
select b.id,t.sku,t.name,t.description,t.category,t.brand,0,false,true
from public.businesses b cross join public.ac_product_templates t
where (b.slug='anshul-car-decor' or lower(b.name)='anshul car decor')
and t.sku in ('ACD-INT-001','ACD-INT-002','ACD-LGT-001','ACD-LGT-002','ACD-LGT-005','ACD-ELC-001','ACD-EXT-001','ACD-CARE-001')
on conflict (business_id,sku) do nothing;

alter table public.ac_product_templates enable row level security;
alter table public.ac_products enable row level security;
drop policy if exists ac_templates_read on public.ac_product_templates;
create policy ac_templates_read on public.ac_product_templates for select to authenticated using (is_active or (select public.is_admin()));
drop policy if exists ac_products_public_read on public.ac_products;
create policy ac_products_public_read on public.ac_products for select to anon,authenticated
using (is_active and is_published and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved'));
drop policy if exists ac_products_manager_read on public.ac_products;
create policy ac_products_manager_read on public.ac_products for select to authenticated
using ((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and (select public.is_owner())));
drop policy if exists ac_products_manager_insert on public.ac_products;
create policy ac_products_manager_insert on public.ac_products for insert to authenticated
with check ((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and (select public.is_owner())));
drop policy if exists ac_products_manager_update on public.ac_products;
create policy ac_products_manager_update on public.ac_products for update to authenticated
using ((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and (select public.is_owner())))
with check ((select public.is_admin()) or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and (select public.is_owner())));
revoke all on public.ac_product_templates,public.ac_products from anon,authenticated;
grant select on public.ac_products to anon;
grant select on public.ac_products,public.ac_product_templates to authenticated;
grant insert,update on public.ac_products to authenticated;
-- Product templates are maintained only by trusted SQL migrations/admin backend.
