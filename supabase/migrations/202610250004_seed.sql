-- Reference data only. No fictional shops or fabricated revenue records.
insert into public.locations(name,city,state) values('Sant Tukaram Nagar','Pimpri','Maharashtra') on conflict(name,city,state) do nothing;
insert into public.categories(name,slug,description) values
 ('Grocery','grocery','Groceries and household essentials'),
 ('Pharmacy','pharmacy','Medical and pharmacy stores'),
 ('Food & Beverage','food-beverage','Restaurants and food outlets'),
 ('Stationery','stationery','Printing and stationery'),
 ('Salon','salon','Grooming services'),
 ('Electronics','electronics','Electronics and repair'),
 ('Optical','optical','Optical retail'),
 ('Produce','produce','Fruit and vegetable shops'),
 ('Personal Care','personal-care','Personal care businesses'),
 ('Other','other','Other local businesses')
on conflict(slug) do nothing;
