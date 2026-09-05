-- ══════════════════════════════════════════════════════════════════════════
--  طرود — إنشاء جداول قاعدة البيانات (Supabase / PostgreSQL)
--  8 جداول مستقلة · يُنفَّذ مرة واحدة من: SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.tarood_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

-- 1) المستخدمون
create table if not exists public.tarood_users (
  id text primary key, name text not null, username text not null unique,
  password text not null,
  role text not null check (role in ('owner','hr','ops','hub','finance','courier')),
  phone text not null default '', hub_ids jsonb not null default '[]'::jsonb,
  online boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tarood_users add column if not exists active boolean not null default true;

-- 2) الطلبات
create table if not exists public.tarood_orders (
  id text primary key, code text not null unique, customer text not null,
  phone text not null, address text not null, zone_id text not null, hub_id text not null,
  cod numeric not null default 0,
  status text not null default 'created' check (status in ('created','assigned','handed',
    'on_way','arrived','delivered','failed','returned')),
  courier_id text, recipient_name text, fail_reason text, fail_note text,
  settlement_id text, pod text, timeline jsonb not null default '[]'::jsonb,
  x numeric not null default 50, y numeric not null default 30,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tarood_orders add column if not exists pod text;
create index if not exists idx_tarood_orders_status  on public.tarood_orders (status);
create index if not exists idx_tarood_orders_courier on public.tarood_orders (courier_id);
create index if not exists idx_tarood_orders_hub     on public.tarood_orders (hub_id);
create index if not exists idx_tarood_orders_zone    on public.tarood_orders (zone_id);

-- 3) المخازن
create table if not exists public.tarood_hubs (
  id text primary key, name text not null, zone_id text not null,
  address text not null default '', phone text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 4) المسارات
create table if not exists public.tarood_routes (
  id text primary key, name text not null, code text not null unique, zone_id text,
  custom boolean not null default false, courier_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 5) المشاكل والحوادث (محادثة البلاغ داخل updates)
create table if not exists public.tarood_issues (
  id text primary key, title text not null,
  type text not null check (type in ('delay','damage','lost','address','customer','courier','other')),
  priority text not null check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','progress','resolved','closed')),
  order_id text, courier_id text, by_name text not null,
  updates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 6) التسويات المالية
create table if not exists public.tarood_settlements (
  id text primary key, courier_id text not null, order_ids jsonb not null default '[]'::jsonb,
  base numeric not null default 0, fees numeric not null default 0,
  adjustments jsonb not null default '[]'::jsonb, net numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','settled')),
  settled_at timestamptz, by_name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 7) عدّادات أكواد التتبع
create table if not exists public.tarood_seq (
  zone_code text primary key, val int not null default 0
);

-- 8) مواقع المندوبين اللحظية
create table if not exists public.tarood_positions (
  courier_id text primary key, x numeric not null, y numeric not null,
  tx numeric not null, ty numeric not null, last_at bigint not null
);

-- ختم updated_at + صلاحيات anon + بث لحظي
do $$
declare t text;
begin
  foreach t in array array['tarood_users','tarood_orders','tarood_hubs','tarood_routes','tarood_issues','tarood_settlements'] loop
    execute format('drop trigger if exists trg_%s_touch on public.%I', t, t);
    execute format('create trigger trg_%s_touch before update on public.%I
      for each row execute function public.tarood_touch()', t, t);
  end loop;
  foreach t in array array['tarood_users','tarood_orders','tarood_hubs','tarood_routes',
    'tarood_issues','tarood_settlements','tarood_seq','tarood_positions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_all" on public.%I', t, t);
    execute format('create policy "%s_all" on public.%I for all to anon, authenticated
      using (true) with check (true)', t, t);
    if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- بذر البداية: حساب المالك + مسارات المناطق الـ22 (القليوبية + القاهرة حتى مدينة نصر)
insert into public.tarood_users (id, name, username, password, role, phone, online, active)
values ('u-owner', 'أحمد الشاذلي', 'owner', '1234', 'owner', '01001234501', true, true)
on conflict (id) do nothing;

insert into public.tarood_routes (id, name, code, zone_id, custom, courier_ids) values
  ('r-BNH','مسار بنها','BNH','z-bnh',false,'[]'::jsonb),
  ('r-KFS','مسار كفر شكر','KFS','z-kfs',false,'[]'::jsonb),
  ('r-TKH','مسار طوخ','TKH','z-tkh',false,'[]'::jsonb),
  ('r-QHA','مسار قها','QHA','z-qha',false,'[]'::jsonb),
  ('r-QLY','مسار قليوب','QLY','z-qls',false,'[]'::jsonb),
  ('r-SHQ','مسار شبين القناطر','SHQ','z-shq',false,'[]'::jsonb),
  ('r-KNK','مسار الخانكة','KNK','z-knk',false,'[]'::jsonb),
  ('r-OBR','مسار العبور','OBR','z-obr',false,'[]'::jsonb),
  ('r-SHK','مسار شبرا الخيمة','SHK','z-shk',false,'[]'::jsonb),
  ('r-BHT','مسار بهتيم','BHT','z-bht',false,'[]'::jsonb),
  ('r-KHS','مسار الخصوص','KHS','z-khs',false,'[]'::jsonb),
  ('r-MTR','مسار مسطرد','MTR','z-mtr',false,'[]'::jsonb),
  ('r-MRG','مسار المرج','MRG','z-mrg',false,'[]'::jsonb),
  ('r-SLM','مسار السلام','SLM','z-slm',false,'[]'::jsonb),
  ('r-AIN','مسار عين شمس','AIN','z-ain',false,'[]'::jsonb),
  ('r-MAT','مسار المطرية','MAT','z-mat',false,'[]'::jsonb),
  ('r-NZH','مسار النزهة','NZH','z-nzh',false,'[]'::jsonb),
  ('r-HLP','مسار مصر الجديدة','HLP','z-hlp',false,'[]'::jsonb),
  ('r-ZTN','مسار الزيتون','ZTN','z-ztn',false,'[]'::jsonb),
  ('r-HKB','مسار حدائق القبة','HKB','z-hkb',false,'[]'::jsonb),
  ('r-AMR','مسار الأميرية','AMR','z-amr',false,'[]'::jsonb),
  ('r-NSR','مسار مدينة نصر','NSR','z-nsr',false,'[]'::jsonb)
on conflict (id) do nothing;

-- تحقق من النتيجة
select
  (select count(*) from public.tarood_users)  as users,
  (select count(*) from public.tarood_routes) as routes,
  (select count(*) from public.tarood_orders) as orders;
