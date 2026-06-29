-- ============================================================
--  LE CADRAN — Bar & Cuisine (Cholet)
--  Étape 1 : mise en place de la base de données Supabase
--
--  À lancer une seule fois dans Supabase :
--  SQL Editor  ->  New query  ->  coller ce fichier  ->  Run
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- Catégories de la carte (Galettes, Crêpes, Cocktails, etc.)
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                         -- nom affiché : "Galettes"
  slug        text not null unique,                  -- identifiant : "galettes"
  section     text not null default 'cuisine',       -- 'cuisine' ou 'bar'
  note        text,                                  -- ex : "Avec soft +3€", "Voir ardoise vins"
  sort_order  int  not null default 0,               -- ordre d'affichage
  is_active   boolean not null default true,         -- catégorie visible ou non
  created_at  timestamptz not null default now()
);

-- Plats / boissons
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id) on delete cascade,
  name          text not null,                       -- "Complète"
  description   text,                                -- "Oeuf, Jambon blanc, Emmental"
  price         text,                                -- texte : "9,5" ou "3,5 / 4,5 / 6"
  image_url     text,                                -- lien vers l'image (Supabase Storage)
  is_available  boolean not null default true,       -- false = en rupture, retiré du menu public
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category_id, name)                         -- évite les doublons
);

create index if not exists idx_items_category   on public.menu_items (category_id);
create index if not exists idx_items_available  on public.menu_items (is_available);


-- ------------------------------------------------------------
-- 2. MISE À JOUR AUTOMATIQUE DE updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_items_updated_at on public.menu_items;
create trigger trg_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 3. SÉCURITÉ (Row Level Security)
--    - Le public (anon) : lecture seule, et seulement ce qui est dispo
--    - Les gérants connectés (authenticated) : tous les droits
-- ------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;

-- Lecture publique des catégories actives
drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
  on public.categories for select to anon
  using (is_active = true);

-- Lecture publique des plats disponibles uniquement
drop policy if exists "public_read_items" on public.menu_items;
create policy "public_read_items"
  on public.menu_items for select to anon
  using (is_available = true);

-- Gérants connectés : accès total aux catégories
drop policy if exists "auth_all_categories" on public.categories;
create policy "auth_all_categories"
  on public.categories for all to authenticated
  using (true) with check (true);

-- Gérants connectés : accès total aux plats
drop policy if exists "auth_all_items" on public.menu_items;
create policy "auth_all_items"
  on public.menu_items for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 4. STOCKAGE DES IMAGES
--    Bucket public en lecture, écriture réservée aux gérants
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "img_public_read"   on storage.objects;
create policy "img_public_read"
  on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists "img_auth_insert"   on storage.objects;
create policy "img_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images');

drop policy if exists "img_auth_update"   on storage.objects;
create policy "img_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-images');

drop policy if exists "img_auth_delete"   on storage.objects;
create policy "img_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images');


-- ============================================================
-- 5. REMPLISSAGE DE LA CARTE
-- ============================================================

-- ---- Catégories ----
insert into public.categories (name, slug, section, note, sort_order) values
  ('Galettes',            'galettes',           'cuisine', null,                 1),
  ('Crêpes',              'crepes',             'cuisine', null,                 2),
  ('Autres gourmandises', 'autres-gourmandises','cuisine', null,                 3),
  ('Bières & cidres',     'bieres-cidres',      'bar',     null,                 4),
  ('Cocktails',           'cocktails',          'bar',     null,                 5),
  ('Digestifs',           'digestifs',          'bar',     null,                 6),
  ('Vins',                'vins',               'bar',     'Voir ardoise vins',  7),
  ('Whisky',              'whisky',             'bar',     'Avec soft +3€',      8),
  ('Vodka',               'vodka',              'bar',     'Avec soft +3€',      9),
  ('Gin',                 'gin',                'bar',     'Avec soft +3€',      10),
  ('Rhum',                'rhum',               'bar',     'Avec soft +3€',      11),
  ('Tequila & mezcal',    'tequila-mezcal',     'bar',     'Avec soft +3€',      12)
on conflict (slug) do nothing;


-- ---- GALETTES ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Complète',     'Oeuf, Jambon blanc, Emmental',                                   '7,8',  1),
  ('Forestière',   'Oeuf, Jambon blanc, Emmental, Champignons',                      '9,5',  2),
  ('Andouille',    'Oeuf, Andouille, Emmental',                                      '8,9',  3),
  ('Andouille Plus','Oeuf, Andouille, Emmental, Confit d''oignons, Crème moutarde miel','9,5',4),
  ('Saumon fumé',  'Saumon fumé, Cream cheese citronné, Ciboulette',                 '13,9', 5),
  ('Buffalo',      'Oeuf, Boeuf effiloché, Emmental, Tomate, Confit d''oignons',     '13,9', 6),
  ('Chèvre miel',  'Oeuf, Emmental, Chèvre, Confit d''oignon, Noix concassées',      '9,8',  7),
  ('Reblochon',    'Oeuf, Pomme de terre, Reblochon, Lardons, Oignons, Crème',       '13,9', 8),
  ('Végétarienne', 'Selon saison',                                                   '9,2',  9)
) as v(name, description, price, sort_order) on c.slug = 'galettes'
on conflict (category_id, name) do nothing;


-- ---- CRÊPES ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Nature',              null::text,                                  '2,5',  1),
  ('Sucre',               null,                                        '3',    2),
  ('Beurre sucre',        null,                                        '3,5',  3),
  ('Les Bonnes Mamans',   null,                                        '4,5',  4),
  ('Beurre sucre citron', null,                                        '4',    5),
  ('Mangez-moi : Nutella',null,                                        '4,5',  6),
  ('Chocolat au lait',    null,                                        '5',    7),
  ('Chocolat noir',       null,                                        '5',    8),
  ('Banane chocolat',     null,                                        '6,5',  9),
  ('Caramel beurre salé', null,                                        '5,5',  10),
  ('Pomme',               null,                                        '5,5',  11),
  ('Pomme chocolat',      null,                                        '6,5',  12),
  ('Flambées',            'Grand Marnier, Cognac, Cointreau, Rhum',    '9',    13)
) as v(name, description, price, sort_order) on c.slug = 'crepes'
on conflict (category_id, name) do nothing;


-- ---- AUTRES GOURMANDISES ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Glaces',                null::text,                                                       '4', 1),
  ('Boule supplémentaire',  null,                                                             '2', 2),
  ('Affogato',              'Boule de glace vanille, Café expresso',                          '6', 3),
  ('Affogato Nutella',      'Nutella, Boule de glace vanille, Noisettes concassées, Café expresso','7',4)
) as v(name, description, price, sort_order) on c.slug = 'autres-gourmandises'
on conflict (category_id, name) do nothing;


-- ---- BIÈRES & CIDRES ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Cadette Blonde 5°',       '25cl / 33cl / 50cl', '3,5 / 4,5 / 6', 1),
  ('Jade Blanche 4,5°',       '25cl / 33cl / 50cl', '4 / 6 / 8',     2),
  ('85 IPA 5,6°',             '25cl / 33cl / 50cl', '4,5 / 6 / 8',   3),
  ('Chouffe Cherry 8°',       'Bouteille 33cl',     '6,5',           4),
  ('Guinness Foreign Extra 7,5°','Bouteille',       '6',             5),
  ('1664 Sans Alcool 0,0°',   'Bouteille',          '5',             6),
  ('Cidre Doux 2°',           null,                 '5',             7),
  ('Cidre Brut 5,5°',         null,                 '5',             8)
) as v(name, description, price, sort_order) on c.slug = 'bieres-cidres'
on conflict (category_id, name) do nothing;


-- ---- COCKTAILS ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Moscow Mule',      null::text, '7,5', 1),
  ('Aperol Spritz',    null,       '7,5', 2),
  ('Hugo Spritz',      null,       '7,5', 3),
  ('Pina Colada',      null,       '7,5', 4),
  ('Mojito',           null,       '7,5', 5),
  ('Caipirinia',       null,       '7,5', 6),
  ('Sex on the Beach', null,       '8,5', 7),
  ('Cuba Libre',       null,       '7,5', 8),
  ('Petit Punch',      null,       '6,5', 9),
  ('Irish Coffee',     null,       '9',   10),
  ('Expresso Martini', null,       '9',   11)
) as v(name, description, price, sort_order) on c.slug = 'cocktails'
on conflict (category_id, name) do nothing;


-- ---- DIGESTIFS ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Lemoncello',     null::text, '5',   1),
  ('Menthe Pastille',null,       '4',   2),
  ('Baileys',        null,       '5',   3),
  ('Get 27',         null,       '4,5', 4),
  ('Ricard',         null,       '3,5', 5),
  ('Martini Rouge',  null,       '5',   6),
  ('Martini Blanc',  null,       '5',   7),
  ('Suze',           null,       '5',   8),
  ('Campari',        null,       '5',   9),
  ('Cognac',         null,       '7',   10),
  ('Berger Blanc',   null,       '3,5', 11),
  ('Donjon 1841',    null,       '4,5', 12)
) as v(name, description, price, sort_order) on c.slug = 'digestifs'
on conflict (category_id, name) do nothing;


-- ---- WHISKY ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('J&B 40°',                null::text, '4,5', 1),
  ('Paddy 40°',              null,       '4,5', 2),
  ('Monkey Shoulder 40°',    null,       '7,5', 3),
  ('Jack Daniel''s 40°',     null,       '5',   4),
  ('Chivas 12 ans 40°',      null,       '7',   5),
  ('Sexton 40°',             null,       '9',   6),
  ('Nikka Coffey Grain 45°', null,       '9',   7)
) as v(name, description, price, sort_order) on c.slug = 'whisky'
on conflict (category_id, name) do nothing;


-- ---- VODKA ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Fjorowka 37,5°', null::text, '4,5', 1),
  ('Absolut 40°',    null,       '5',   2),
  ('Belvedere 40°',  null,       '9',   3)
) as v(name, description, price, sort_order) on c.slug = 'vodka'
on conflict (category_id, name) do nothing;


-- ---- GIN ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Lionheart 37,5°',     null::text, '4,5', 1),
  ('Bombay Sapphire 40°', null,       '5,5', 2),
  ('Hendrick''s 40°',     null,       '7',   3),
  ('Suntory Roku 43°',    null,       '7',   4)
) as v(name, description, price, sort_order) on c.slug = 'gin'
on conflict (category_id, name) do nothing;


-- ---- RHUM ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Captain Morgan',          null::text, '4,5', 1),
  ('Havana Club 3 ans 37,5°', null,       '4,5', 2),
  ('Planteray XO 20 ans 40°', null,       '9',   3),
  ('Rhum Clément 40°',        null,       '7',   4),
  ('Diplomatico 40°',         null,       '8',   5),
  ('HSE Blanc 40°',           null,       '4,5', 6)
) as v(name, description, price, sort_order) on c.slug = 'rhum'
on conflict (category_id, name) do nothing;


-- ---- TEQUILA & MEZCAL ----
insert into public.menu_items (category_id, name, description, price, sort_order)
select id, v.name, v.description, v.price, v.sort_order
from public.categories c
join (values
  ('Tiscaz 35°',                null::text, '4,5', 1),
  ('Patron 40°',                null,       '8',   2),
  ('Mezcal La Escondida 40°',   null,       '8',   3)
) as v(name, description, price, sort_order) on c.slug = 'tequila-mezcal'
on conflict (category_id, name) do nothing;


-- ============================================================
--  Terminé. Vérifiez avec :
--    select c.name, count(i.id)
--    from categories c left join menu_items i on i.category_id = c.id
--    group by c.name order by min(c.sort_order);
-- ============================================================
