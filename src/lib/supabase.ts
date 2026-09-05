// ─── طرود: عميل Supabase — جدول مستقل لكل كيان + بث لحظي ────────────────────
import { createClient } from '@supabase/supabase-js';
import type { DB, User, Hub, Route, Order, Issue, Settlement, CourierPos } from './data';
import { SEED_VERSION } from './data';

// ── الإعدادات من ملف .env — عدّلها هناك بدون لمس الكود ──
// القيم الاحتياطية تُستخدم فقط إذا لم يوجد ملف .env
const FALLBACK_URL = 'https://ncsufsacdzapfmfagron.supabase.co';
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3Vmc2FjZHphcGZtZmFncm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDg0MzUsImV4cCI6MjEwMzUyNDQzNX0.SWiBb0Hf-E5HmC-idjKs20FurHSeBir-P9sUvDxdCcI';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || FALLBACK_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || FALLBACK_ANON;

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[طرود] لم يُضبط VITE_SUPABASE_URL في ملف .env — تُستخدم القيم الاحتياطية. انسخ .env.example إلى .env.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 5 } },
});

/** مرجع المشروع — يُستخرج تلقائيًا من رابط القاعدة، ويُستخدم لروابط SQL Editor */
export const PROJECT_REF = (() => {
  try {
    const host = new URL(SUPABASE_URL).hostname; // ncsufsacdzapfmfagron.supabase.co
    return host.split('.')[0];
  } catch {
    return 'ncsufsacdzapfmfagron';
  }
})();

export const T = {
  users: 'tarood_users', hubs: 'tarood_hubs', routes: 'tarood_routes',
  orders: 'tarood_orders', issues: 'tarood_issues', settlements: 'tarood_settlements',
  seq: 'tarood_seq', positions: 'tarood_positions',
} as const;
export type TableKey = keyof typeof T;

const PK: Record<TableKey, string> = {
  users: 'id', hubs: 'id', routes: 'id', orders: 'id',
  issues: 'id', settlements: 'id', seq: 'zone_code', positions: 'courier_id',
};

export class SupaError extends Error {
  missingTable: boolean;
  constructor(message: string, missingTable = false) {
    super(message);
    this.missingTable = missingTable;
  }
}

const MISSING = /42P01|PGRST205|does not exist|schema cache/i;
const wrap = (e: { message?: string; code?: string } | null): SupaError =>
  new SupaError(e?.message ?? 'خطأ غير معروف', MISSING.test(`${e?.code ?? ''} ${e?.message ?? ''}`));

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Date.now());

// ── تحويل الصفوف ↔ كائنات التطبيق ──
export const userToRow = (u: User): Record<string, unknown> => ({
  id: u.id, name: u.name, username: u.username, password: u.password, role: u.role,
  phone: u.phone, hub_ids: u.hubIds, online: u.online, active: u.active !== false,
  created_at: new Date(u.createdAt).toISOString(),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToUser = (r: any): User => ({
  id: r.id, name: r.name, username: r.username, password: r.password, role: r.role,
  phone: r.phone ?? '', hubIds: r.hub_ids ?? [], online: !!r.online, active: r.active !== false,
  createdAt: ms(r.created_at),
});

export const hubToRow = (h: Hub): Record<string, unknown> => ({
  id: h.id, name: h.name, zone_id: h.zoneId, address: h.address, phone: h.phone,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToHub = (r: any): Hub => ({ id: r.id, name: r.name, zoneId: r.zone_id, address: r.address ?? '', phone: r.phone ?? '' });

export const routeToRow = (rt: Route): Record<string, unknown> => ({
  id: rt.id, name: rt.name, code: rt.code, zone_id: rt.zoneId, custom: rt.custom, courier_ids: rt.courierIds,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToRoute = (r: any): Route => ({
  id: r.id, name: r.name, code: r.code, zoneId: r.zone_id ?? null, custom: !!r.custom, courierIds: r.courier_ids ?? [],
});

export const orderToRow = (o: Order): Record<string, unknown> => ({
  id: o.id, code: o.code, customer: o.customer, phone: o.phone, address: o.address,
  zone_id: o.zoneId, hub_id: o.hubId, cod: o.cod, status: o.status,
  courier_id: o.courierId ?? null, recipient_name: o.recipientName ?? null,
  fail_reason: o.failReason ?? null, fail_note: o.failNote ?? null,
  settlement_id: o.settlementId ?? null, pod: o.pod ?? null,
  timeline: o.timeline, x: o.x, y: o.y,
  created_at: new Date(o.createdAt).toISOString(),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToOrder = (r: any): Order => ({
  id: r.id, code: r.code, customer: r.customer, phone: r.phone, address: r.address,
  zoneId: r.zone_id, hubId: r.hub_id, cod: Number(r.cod ?? 0), status: r.status,
  courierId: r.courier_id ?? undefined, recipientName: r.recipient_name ?? undefined,
  failReason: r.fail_reason ?? undefined, failNote: r.fail_note ?? undefined,
  settlementId: r.settlement_id ?? undefined, pod: r.pod ?? undefined,
  timeline: r.timeline ?? [], x: Number(r.x ?? 50), y: Number(r.y ?? 30),
  createdAt: ms(r.created_at), updatedAt: ms(r.updated_at),
});

export const issueToRow = (i: Issue): Record<string, unknown> => ({
  id: i.id, title: i.title, type: i.type, priority: i.priority, status: i.status,
  order_id: i.orderId ?? null, courier_id: i.courierId ?? null, by_name: i.by,
  updates: i.updates, created_at: new Date(i.createdAt).toISOString(),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToIssue = (r: any): Issue => ({
  id: r.id, title: r.title, type: r.type, priority: r.priority, status: r.status,
  orderId: r.order_id ?? undefined, courierId: r.courier_id ?? undefined, by: r.by_name ?? '',
  updates: r.updates ?? [], createdAt: ms(r.created_at),
});

export const settlementToRow = (s: Settlement): Record<string, unknown> => ({
  id: s.id, courier_id: s.courierId, order_ids: s.orderIds, base: s.base, fees: s.fees,
  adjustments: s.adjustments, net: s.net, status: s.status,
  settled_at: s.settledAt ? new Date(s.settledAt).toISOString() : null,
  by_name: s.by, created_at: new Date(s.createdAt).toISOString(),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToSettlement = (r: any): Settlement => ({
  id: r.id, courierId: r.courier_id, orderIds: r.order_ids ?? [], base: Number(r.base ?? 0),
  fees: Number(r.fees ?? 0), adjustments: r.adjustments ?? [], net: Number(r.net ?? 0), status: r.status,
  settledAt: r.settled_at ? Date.parse(r.settled_at) : undefined, by: r.by_name ?? '', createdAt: ms(r.created_at),
});

export const posToRow = (courierId: string, p: CourierPos): Record<string, unknown> => ({
  courier_id: courierId, x: p.x, y: p.y, tx: p.tx, ty: p.ty, last_at: p.lastAt,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPos = (r: any): CourierPos => ({
  x: Number(r.x ?? 0), y: Number(r.y ?? 0), tx: Number(r.tx ?? 0), ty: Number(r.ty ?? 0), lastAt: Number(r.last_at ?? 0),
});

export const MAPS: Record<TableKey, (rows: unknown[]) => unknown> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: (rows) => (rows as any[]).map(rowToUser),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hubs: (rows) => (rows as any[]).map(rowToHub),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: (rows) => (rows as any[]).map(rowToRoute),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: (rows) => (rows as any[]).map(rowToOrder),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issues: (rows) => (rows as any[]).map(rowToIssue),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settlements: (rows) => (rows as any[]).map(rowToSettlement),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seq: (rows) => Object.fromEntries((rows as any[]).map((r) => [r.zone_code, Number(r.val)])),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  positions: (rows) => Object.fromEntries((rows as any[]).map((r) => [r.courier_id, rowToPos(r)])),
};

// ── القراءة ──
export async function fetchAll(): Promise<DB> {
  const [u, h, rt, o, i, s, q, p] = await Promise.all([
    supabase.from(T.users).select('*'),
    supabase.from(T.hubs).select('*'),
    supabase.from(T.routes).select('*'),
    supabase.from(T.orders).select('*'),
    supabase.from(T.issues).select('*'),
    supabase.from(T.settlements).select('*'),
    supabase.from(T.seq).select('*'),
    supabase.from(T.positions).select('*'),
  ]);
  for (const res of [u, h, rt, o, i, s, q, p]) if (res.error) throw wrap(res.error);

  const seq: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (q.data ?? []) as any[]) seq[row.zone_code] = Number(row.val);
  const positions: Record<string, CourierPos> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (p.data ?? []) as any[]) positions[row.courier_id] = rowToPos(row);

  return {
    v: SEED_VERSION, rev: 0, updatedAt: Date.now(),
    users: (u.data ?? []).map(rowToUser),
    hubs: (h.data ?? []).map(rowToHub),
    routes: (rt.data ?? []).map(rowToRoute),
    orders: (o.data ?? []).map(rowToOrder),
    issues: (i.data ?? []).map(rowToIssue),
    settlements: (s.data ?? []).map(rowToSettlement),
    seq, positions,
  };
}

export async function fetchTable(key: TableKey): Promise<unknown[]> {
  const { data, error } = await supabase.from(T[key]).select('*');
  if (error) throw wrap(error);
  return data ?? [];
}

// ── الكتابة ──
export async function upsertRows(key: TableKey, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase.from(T[key]).upsert(rows);
  if (error) throw wrap(error);
}

export async function deleteRows(key: TableKey, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from(T[key]).delete().in(PK[key], ids);
  if (error) throw wrap(error);
}

export async function clearTable(key: TableKey): Promise<void> {
  const { error } = await supabase.from(T[key]).delete().not(PK[key], 'is', null);
  if (error) throw wrap(error);
}

// ── الاشتراك اللحظي بكل الجداول ──
export function subscribeTables(onChange: (key: TableKey) => void): () => void {
  let ch = supabase.channel('tarood-rt');
  (Object.keys(T) as TableKey[]).forEach((key) => {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: T[key] }, () => onChange(key));
  });
  ch.subscribe();
  return () => { supabase.removeChannel(ch); };
}
