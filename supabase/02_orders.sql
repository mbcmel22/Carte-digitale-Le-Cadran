-- ============================================================
--  LE CADRAN — Étape 3 : commandes en ligne
--  À lancer dans Supabase (SQL Editor) APRÈS 01_setup_supabase.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- Une commande passée depuis une table
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  table_number  text not null,
  status        text not null default 'nouvelle',  -- nouvelle | en_cours | termine | servi
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Les lignes d'une commande (on garde une copie du nom et du prix
-- au moment de la commande, au cas où la carte change ensuite)
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  name          text not null,
  price         text,
  quantity      int  not null default 1
);

create index if not exists idx_orders_status      on public.orders (status);
create index if not exists idx_orders_created      on public.orders (created_at);
create index if not exists idx_order_items_order   on public.order_items (order_id);

-- updated_at automatique sur les commandes
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2. SÉCURITÉ
--    - Le client (anon) ne peut PAS lire les commandes des autres.
--      Il passe commande via la fonction place_order ci-dessous.
--    - Les gérants connectés voient et gèrent toutes les commandes.
-- ------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "auth_all_orders" on public.orders;
create policy "auth_all_orders"
  on public.orders for all to authenticated
  using (true) with check (true);

drop policy if exists "auth_all_order_items" on public.order_items;
create policy "auth_all_order_items"
  on public.order_items for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 3. FONCTION DE PASSAGE DE COMMANDE
--    Le client appelle place_order(numero_table, lignes).
--    La fonction insère la commande et ses lignes de façon sûre,
--    sans donner au client l'accès direct aux tables.
-- ------------------------------------------------------------
create or replace function public.place_order(p_table text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
begin
  if p_table is null or length(trim(p_table)) = 0 then
    raise exception 'Numéro de table manquant';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Commande vide';
  end if;

  insert into public.orders (table_number, status)
  values (trim(p_table), 'nouvelle')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (order_id, menu_item_id, name, price, quantity)
    values (
      v_order_id,
      nullif(v_item->>'id', '')::uuid,
      coalesce(v_item->>'name', 'Article'),
      v_item->>'price',
      greatest(coalesce((v_item->>'quantity')::int, 1), 1)
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(text, jsonb) to anon, authenticated;


-- ------------------------------------------------------------
-- 4. TEMPS RÉEL (optionnel)
--    Permet au back office d'être notifié des nouvelles commandes.
--    Le back office fonctionne aussi sans, par rafraîchissement régulier.
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception when others then null;
end $$;

-- ============================================================
--  Terminé.
-- ============================================================
