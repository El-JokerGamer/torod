// ─── طرود: المخزن اللحظي — مزامنة سليمة مع جداول Supabase الثمانية ──────────
import { useSyncExternalStore } from 'react';
import { initialState, uid, SEED_VERSION, zoneById, money, BASE_OWNER_ID } from './data';
import type { DB, User, Role, Order, OrderStatus, Issue, IssueStatus, Priority, IssueType, Settlement } from './data';
import {
  fetchAll, fetchTable, upsertRows, deleteRows, subscribeTables, MAPS,
  userToRow, routeToRow, orderToRow, hubToRow, issueToRow, settlementToRow, posToRow, SupaError,
} from './supabase';
import type { TableKey } from './supabase';

const DB_KEY = 'taroud-db';
const SESSION_KEY = 'taroud-session';

const normalize = (d: DB): DB => ({
  ...d, rev: d.rev ?? 0, updatedAt: d.updatedAt ?? Date.now(), positions: d.positions ?? {},
});

function loadLocal(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const d = JSON.parse(raw) as DB;
      if (d && d.v === SEED_VERSION && Array.isArray(d.orders)) return normalize(d);
    }
  } catch { /* تجاهل */ }
  return initialState();
}

// ── الحالة وخط الأساس ──
let state: DB = loadLocal();
let base: DB = loadLocal();
let remoteReady = false;
let bootedOnce = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveLocal() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(state)); } catch { /* */ }
}
function notify() {
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLocal, 300);
}

export const getState = () => state;
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useDB(): DB {
  return useSyncExternalStore(subscribe, getState);
}

// ── التنبيهات ──
export interface ToastItem { id: string; msg: string; kind: 'success' | 'error' | 'info' | 'warn' }
let toasts: ToastItem[] = [];
const toastListeners = new Set<() => void>();
export const useToasts = () =>
  useSyncExternalStore((l) => { toastListeners.add(l); return () => toastListeners.delete(l); }, () => toasts);
export function toast(msg: string, kind: ToastItem['kind'] = 'success') {
  const item = { id: uid(), msg, kind };
  toasts = [...toasts, item].slice(-4);
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    toastListeners.forEach((l) => l());
  }, 4200);
}

// ── دفع الفروق إلى جداول قاعدة البيانات ──
const SYNC: { key: TableKey; pick: (d: DB) => { id: string }[]; toRow: (x: never) => Record<string, unknown> }[] = [
  { key: 'users', pick: (d) => d.users, toRow: (x) => userToRow(x as unknown as User) },
  { key: 'hubs', pick: (d) => d.hubs, toRow: (x) => hubToRow(x as unknown as Parameters<typeof hubToRow>[0]) },
  { key: 'routes', pick: (d) => d.routes, toRow: (x) => routeToRow(x as unknown as Parameters<typeof routeToRow>[0]) },
  { key: 'orders', pick: (d) => d.orders, toRow: (x) => orderToRow(x as unknown as Parameters<typeof orderToRow>[0]) },
  { key: 'issues', pick: (d) => d.issues, toRow: (x) => issueToRow(x as unknown as Parameters<typeof issueToRow>[0]) },
  { key: 'settlements', pick: (d) => d.settlements, toRow: (x) => settlementToRow(x as unknown as Parameters<typeof settlementToRow>[0]) },
];

let lastSyncFail = 0;
function onSyncFail(e: unknown) {
  console.error('[taroud] sync push failed:', e);
  const now = Date.now();
  if (now - lastSyncFail > 20000) {
    lastSyncFail = now;
    toast('تعذّر رفع التغييرات لقاعدة البيانات — سيُعاد الدفع تلقائيًا', 'error');
  }
}

function diffPush(from: DB, to: DB) {
  if (!remoteReady) return;
  for (const t of SYNC) {
    const before = new Map(t.pick(from).map((x) => [x.id, x]));
    const after = t.pick(to);
    const upsert: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const item of after) {
      seen.add(item.id);
      const old = before.get(item.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) upsert.push(t.toRow(item as never));
    }
    const remove = [...before.keys()].filter((id) => !seen.has(id));
    if (upsert.length) upsertRows(t.key, upsert).catch(onSyncFail);
    if (remove.length) deleteRows(t.key, remove).catch(onSyncFail);
  }
  const seqUpsert = Object.entries(to.seq)
    .filter(([k, v]) => from.seq[k] !== v)
    .map(([zone_code, val]) => ({ zone_code, val }));
  const seqRemove = Object.keys(from.seq).filter((k) => !(k in to.seq));
  if (seqUpsert.length) upsertRows('seq', seqUpsert).catch(onSyncFail);
  if (seqRemove.length) deleteRows('seq', seqRemove).catch(onSyncFail);
  base = to;
}

export function mutate(fn: (d: DB) => void, opts: { sync?: boolean } = {}) {
  const prev = state;
  const draft = JSON.parse(JSON.stringify(prev)) as DB;
  fn(draft);
  state = normalize(draft);
  notify();
  if (opts.sync !== false) diffPush(prev, state);
}

// ── حالة الاتصال ──
export type Conn = 'connecting' | 'live' | 'setup' | 'local';
let conn: Conn = 'connecting';
const connListeners = new Set<() => void>();
export const useConn = (): Conn =>
  useSyncExternalStore((l) => { connListeners.add(l); return () => connListeners.delete(l); }, () => conn);
const setConn = (c: Conn) => { conn = c; connListeners.forEach((l) => l()); };

let bootError = '';
const bootErrListeners = new Set<() => void>();
export const useBootError = () =>
  useSyncExternalStore((l) => { bootErrListeners.add(l); return () => bootErrListeners.delete(l); }, () => bootError);

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('انتهت مهلة الاتصال')), ms))]);

let unsubRealtime: (() => void) | null = null;
let started = false;

export function startApp(): void {
  if (started) return;
  started = true;
  void initRemote();
}
export function retryInit(): void {
  setConn('connecting');
  void initRemote();
}

async function initRemote(): Promise<void> {
  setConn('connecting');
  try {
    const remote = await withTimeout(fetchAll(), 9000);
    bootError = '';

    if (remote.users.length === 0) {
      const init = initialState();
      state = normalize(init);
      base = normalize(init);
      remoteReady = true;
      await upsertRows('users', init.users.map(userToRow));
      await upsertRows('routes', init.routes.map(routeToRow));
    } else {
      const merged = mergeRemote(state, remote);
      const hadLocalOnly = JSON.stringify(merged) !== JSON.stringify(remote);
      state = normalize(merged);
      base = normalize({ ...merged });
      remoteReady = true;
      if (hadLocalOnly) diffPush(normalize(remote), state);
    }

    bootedOnce = true;
    saveLocal();
    setConn('live');
    attachRealtime();
    notify();
  } catch (e) {
    remoteReady = false;
    bootError = e instanceof Error ? e.message : String(e);
    console.error('[taroud] initRemote:', e);
    setConn(e instanceof SupaError && e.missingTable ? 'setup' : 'local');
    if (!bootedOnce) base = state;
    notify();
  }
}

function mergeRemote(local: DB, remote: DB): DB {
  const keep = <T extends { id: string }>(loc: T[], rem: T[]): T[] => {
    const remIds = new Set(rem.map((r) => r.id));
    return [...rem, ...loc.filter((l) => !remIds.has(l.id))];
  };
  return {
    ...remote,
    users: keep(local.users, remote.users),
    hubs: keep(local.hubs, remote.hubs),
    routes: keep(local.routes, remote.routes),
    orders: keep(local.orders, remote.orders),
    issues: keep(local.issues, remote.issues),
    settlements: keep(local.settlements, remote.settlements),
    seq: { ...remote.seq },
    positions: local.positions && Object.keys(local.positions).length ? local.positions : remote.positions,
  };
}

function attachRealtime() {
  if (unsubRealtime) unsubRealtime();
  unsubRealtime = subscribeTables((key) => {
    void (async () => {
      try {
        const rows = await fetchTable(key);
        const slice = MAPS[key](rows);
        state = normalize({ ...state, [key]: slice } as DB);
        base = normalize({ ...base, [key]: slice } as DB);
        notify();
      } catch { /* حدث عابر */ }
    })();
  });
}

// مزامنة بين نوافذ نفس الجهاز
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        const d = JSON.parse(e.newValue) as DB;
        if (d && d.v === SEED_VERSION) { state = normalize(d); base = state; listeners.forEach((l) => l()); }
      } catch { /* */ }
    }
  });
}

// ── الجلسة ──
let sessionId: string | null = localStorage.getItem(SESSION_KEY);
const sessionListeners = new Set<() => void>();
export const useSessionId = () =>
  useSyncExternalStore((l) => { sessionListeners.add(l); return () => sessionListeners.delete(l); }, () => sessionId);
const emitSession = () => sessionListeners.forEach((l) => l());

export function useMe(): User | null {
  const db = useDB();
  const sid = useSessionId();
  if (!sid) return null;
  return db.users.find((u) => u.id === sid) ?? null;
}

export function login(username: string, password: string): { ok: true } | { ok: false; error: string } {
  const u = state.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u) return { ok: false, error: 'اسم المستخدم غير موجود في نظام الفريق' };
  if (u.password !== password) return { ok: false, error: 'كلمة المرور غير صحيحة' };
  if (u.active === false) return { ok: false, error: 'حسابك معطّل — يرجى التواصل مع الموارد البشرية أو مشرف العمليات لتفعيله' };
  sessionId = u.id;
  localStorage.setItem(SESSION_KEY, u.id);
  emitSession();
  return { ok: true };
}

export function logout() {
  sessionId = null;
  localStorage.removeItem(SESSION_KEY);
  emitSession();
}

// ── صلاحيات ──
const can = (me: User, roles: Role[]) => roles.includes(me.role);

// ── إجراءات: الفريق ──
export function saveUser(me: User, data: { name: string; username: string; password: string; role: Role; phone: string; hubIds: string[]; active?: boolean }, id?: string) {
  if (!can(me, ['owner', 'hr'])) return toast('صلاحية غير كافية', 'error');
  const target = id ? state.users.find((u) => u.id === id) : undefined;
  if (target && target.role === 'owner' && me.id !== target.id)
    return toast('حساب المالك لا يمكن تعديله إلا من المالك نفسه', 'error');
  if (target && target.role === 'owner' && data.role !== 'owner')
    return toast('لا يمكن تغيير دور المالك — رقِّ مستخدمًا آخر لدور المالك أولًا', 'error');
  if (target && target.role === 'hr' && data.role !== 'hr' && me.role !== 'owner')
    return toast('دور الموارد البشرية ثابت — لا يغيّره إلا المالك', 'error');
  const clash = state.users.find((u) => u.username.toLowerCase() === data.username.trim().toLowerCase() && u.id !== id);
  if (clash) return toast('اسم المستخدم مستخدم بالفعل', 'error');
  mutate((d) => {
    if (id) {
      const u = d.users.find((x) => x.id === id);
      if (!u) return;
      Object.assign(u, { name: data.name, username: data.username, password: data.password, role: data.role, phone: data.phone, hubIds: data.role === 'hub' ? data.hubIds : [], active: data.active ?? u.active });
    } else {
      d.users.push({
        id: uid(), name: data.name, username: data.username, password: data.password, role: data.role,
        phone: data.phone, hubIds: data.role === 'hub' ? data.hubIds : [], online: false, active: true, createdAt: Date.now(),
      });
    }
  });
  toast(id ? 'تم حفظ التعديلات' : 'تمت إضافة المستخدم');
}

export function toggleUserActive(me: User, id: string) {
  if (!can(me, ['owner', 'ops', 'hr'])) return toast('صلاحية غير كافية', 'error');
  const target = state.users.find((u) => u.id === id);
  if (!target) return;
  if (target.role === 'owner') return toast('حساب المالك محمي ولا يمكن تعطيله', 'error');
  if (me.id === id) return toast('لا يمكنك تعطيل حسابك الحالي', 'error');
  mutate((d) => {
    const u = d.users.find((x) => x.id === id);
    if (u) u.active = !u.active;
  });
  toast(target.active ? `تم تعطيل حساب ${target.name}` : `تم تفعيل حساب ${target.name}`, target.active ? 'warn' : 'success');
}

export function deleteUser(me: User, id: string) {
  if (!can(me, ['owner', 'hr'])) return toast('صلاحية غير كافية', 'error');
  const target = state.users.find((u) => u.id === id);
  if (target?.role === 'owner') return toast('حسابات الملاك محمية من الحذف', 'error');
  if (me.id === id) return toast('لا يمكنك حذف حسابك الحالي', 'error');
  mutate((d) => {
    d.users = d.users.filter((u) => u.id !== id);
    d.routes.forEach((r) => { r.courierIds = r.courierIds.filter((c) => c !== id); });
    d.orders.forEach((o) => { if (o.courierId === id && o.status === 'assigned') o.status = 'created'; });
    delete d.positions[id];
  });
  if (sessionId === id) { sessionId = null; localStorage.removeItem(SESSION_KEY); emitSession(); }
  toast('تم حذف المستخدم من النظام بالكامل', 'warn');
}

// ── إجراءات: المخازن ──
export function saveHub(me: User, data: { name: string; zoneId: string; address: string; phone: string }, id?: string) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  mutate((d) => {
    if (id) {
      const h = d.hubs.find((x) => x.id === id);
      if (h) Object.assign(h, data);
    } else {
      d.hubs.push({ id: uid(), ...data });
    }
  });
  toast(id ? 'تم حفظ المخزن' : 'تمت إضافة المخزن');
}

export function deleteHub(me: User, id: string) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  if (state.orders.some((o) => o.hubId === id && !['delivered', 'failed', 'returned'].includes(o.status)))
    return toast('لا يمكن حذف مخزن لديه طلبات نشطة', 'error');
  mutate((d) => {
    d.hubs = d.hubs.filter((h) => h.id !== id);
    d.users.forEach((u) => { u.hubIds = u.hubIds.filter((x) => x !== id); });
  });
  toast('تم حذف المخزن', 'warn');
}

// ── إجراءات: المسارات ──
export function addRoute(me: User, data: { name: string; code: string; courierIds: string[]; deliveryFee?: number }) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  if (state.routes.some((r) => r.code.toUpperCase() === data.code.toUpperCase()))
    return toast('كود المسار مستخدم بالفعل', 'error');
  mutate((d) => d.routes.push({ id: uid(), name: data.name, code: data.code.toUpperCase(), zoneId: null, custom: true, courierIds: data.courierIds, deliveryFee: data.deliveryFee ?? 0 }));
  toast('تم إنشاء المسار المخصص');
}

export function updateRouteDeliveryFee(me: User, routeId: string, deliveryFee: number) {
  if (!can(me, ['owner'])) return toast('صلاحية غير كافية — المالك فقط', 'error');
  mutate((d) => {
    const r = d.routes.find((x) => x.id === routeId);
    if (r) r.deliveryFee = deliveryFee;
  });
  toast('تم تحديث قيمة التوصيل');
}

export function setRouteCouriers(me: User, routeId: string, courierIds: string[]) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  mutate((d) => {
    const r = d.routes.find((x) => x.id === routeId);
    if (r) r.courierIds = courierIds;
  });
  toast('تم حفظ توزيع المندوبين');
}

// ── إجراءات: الطلبات ──
const zoneX = (zid: string) => (zoneById(zid)?.x ?? 50) + (Math.random() * 2 - 1);
const zoneY = (zid: string) => (zoneById(zid)?.y ?? 30) + (Math.random() * 2 - 1);

const ev = (by: string, label: string, kind: 'ok' | 'info' | 'warn' | 'bad' = 'info', note?: string) =>
  ({ at: Date.now(), by, label, kind, note });
const touch = (o: Order, e: ReturnType<typeof ev>) => { o.timeline.push(e); o.updatedAt = Date.now(); };

export function createOrder(me: User, data: { customer: string; phone: string; address: string; zoneId: string; cod: number; hubId: string; paymentType: 'cod' | 'online'; deliveryFee?: number }) {
  if (!can(me, ['owner', 'ops', 'hub'])) return toast('صلاحية غير كافية', 'error');
  if (me.role === 'hub' && !me.hubIds.includes(data.hubId))
    return toast('يمكنك إنشاء طلبات لمخازنك المرتبطة فقط', 'error');
  const zone = zoneById(data.zoneId);
  mutate((d) => {
    const seq = (d.seq[zone!.code] ?? 0) + 1;
    d.seq[zone!.code] = seq;
    const code = `${zone!.code}-${String(seq).padStart(4, '0')}`;
    const now = Date.now();
    // جلب قيمة التوصيل من المسار المرتبط بالمنطقة
    const route = d.routes.find((r) => r.zoneId === data.zoneId);
    const deliveryFee = data.deliveryFee ?? route?.deliveryFee ?? 0;
    d.orders.unshift({
      id: uid(), code, customer: data.customer, phone: data.phone, address: data.address,
      zoneId: data.zoneId, hubId: data.hubId, cod: data.cod, paymentType: data.paymentType, status: 'created',
      timeline: [ev(me.name, 'إنشاء الطلب')], x: zoneX(data.zoneId), y: zoneY(data.zoneId),
      createdAt: now, updatedAt: now,
    });
  });
  toast(`تم إنشاء الطلب ${zone?.code}-${String((state.seq[zone?.code ?? ''] ?? 0)).padStart(4, '0')}`);
}

export function assignCourier(me: User, orderId: string, courierId: string) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  mutate((d) => {
    const o = d.orders.find((x) => x.id === orderId);
    const c = d.users.find((u) => u.id === courierId);
    if (!o || !c) return;
    if (!['created', 'assigned'].includes(o.status)) return;
    const was = o.status === 'assigned';
    o.status = 'assigned';
    o.courierId = courierId;
    touch(o, ev(me.name, was ? `تغيير المندوب إلى ${c.name}` : `إسناد الطلب للمندوب ${c.name}`, 'info'));
  });
  toast('تم الإسناد — ظهر الطلب في تطبيق المندوب فورًا');
}

export function openCodeForCourier(me: User, orderId: string) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return;
  if (me.role === 'hub' && !me.hubIds.includes(o.hubId)) return toast('هذا الطلب خارج مخازنك المرتبطة', 'error');
  if (o.status !== 'assigned') return toast('أسند الطلب لمندوب أولًا ليتمكن من مسحه', 'error');
  mutate((d) => {
    const ord = d.orders.find((x) => x.id === orderId)!;
    touch(ord, ev(me.name, `فتح كود التتبع ${o.code} للمندوب للاستلام`, 'info'));
  });
  toast(`اعرض الكود ${o.code} على المندوب ليمسحه من تطبيقه`, 'info');
}

export function markReturned(me: User, orderId: string) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.status !== 'failed') return toast('يُحوَّل للمرتجع الطلبُ الفاشل فقط', 'error');
  mutate((d) => {
    const ord = d.orders.find((x) => x.id === orderId)!;
    ord.status = 'returned';
    touch(ord, ev(me.name, 'تحويل الطلب إلى مرتجع بقرار إداري', 'warn'));
  });
  toast('تم تحويل الطلب إلى مرتجع');
}

export function deleteOrder(me: User, orderId: string) {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  mutate((d) => { d.orders = d.orders.filter((o) => o.id !== orderId); });
  toast('تم حذف الطلب نهائيًا', 'warn');
}

// ── إجراءات المندوب ──
function courierAction(me: User, orderId: string, from: OrderStatus[], to: OrderStatus, label: string, kind: 'ok' | 'info' | 'warn' | 'bad' = 'info', extra?: (o: Order) => void) {
  if (me.role !== 'courier') return toast('صلاحية غير كافية', 'error');
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.courierId !== me.id) return toast('هذا الطلب ليس من مهامك', 'error');
  if (!from.includes(o.status)) return toast('الحالة الحالية لا تسمح بهذا الإجراء', 'error');
  mutate((d) => {
    const ord = d.orders.find((x) => x.id === orderId)!;
    ord.status = to;
    extra?.(ord);
    touch(ord, ev(me.name, label, kind));
  });
  toast(label, kind === 'ok' ? 'success' : kind === 'warn' || kind === 'bad' ? 'warn' : 'info');
}

export const courierScanReceive = (me: User, orderId: string) =>
  courierAction(me, orderId, ['assigned'], 'handed', 'استلام الشحنة من المخزن (مسح باركود)', 'ok');
export const courierOnWay = (me: User, orderId: string) =>
  courierAction(me, orderId, ['handed'], 'on_way', 'التحرك نحو العميل');
export const courierArrived = (me: User, orderId: string) =>
  courierAction(me, orderId, ['on_way'], 'arrived', 'الوصول لموقع العميل');
export const courierDeliver = (me: User, orderId: string, recipientName: string, pod?: string) =>
  courierAction(me, orderId, ['arrived', 'on_way'], 'delivered', `تم التسليم — المستلم: ${recipientName}`, 'ok', (o) => {
    o.recipientName = recipientName;
    if (pod) o.pod = pod;
  });
export const courierFail = (me: User, orderId: string, reason: string, note: string) =>
  courierAction(me, orderId, ['on_way', 'arrived'], 'failed', `فشل التسليم — ${reason}`, 'bad', (o) => {
    o.failReason = reason; o.failNote = note || undefined;
  });

// ── إجراءات: البلاغات ومحادثة المرتجعات ──
export function addIssue(me: User, data: { title: string; type: IssueType; priority: Priority; orderId?: string; courierId?: string; note: string }) {
  mutate((d) => {
    d.issues.unshift({
      id: uid(), title: data.title, type: data.type, priority: data.priority, status: 'open',
      orderId: data.orderId || undefined, courierId: data.courierId || (me.role === 'courier' ? me.id : undefined),
      by: me.name, createdAt: Date.now(),
      updates: data.note ? [{ at: Date.now(), by: me.name, byRole: me.role, note: data.note }] : [],
    });
  });
  toast('تم تسجيل البلاغ');
}

export function updateIssue(me: User, issueId: string, note: string, status?: IssueStatus) {
  mutate((d) => {
    const i = d.issues.find((x) => x.id === issueId);
    if (!i) return;
    if (status) i.status = status;
    if (note) i.updates.push({ at: Date.now(), by: me.name, byRole: me.role, note, status });
  });
  if (status) toast('تم تحديث حالة البلاغ');
}

export function chatOnIssue(me: User, issueId: string, text: string) {
  const msg = text.trim();
  if (!msg) return;
  const i = state.issues.find((x) => x.id === issueId);
  if (i?.status === 'closed' && me.role === 'courier') return toast('البلاغ مغلق — المحادثة للقراءة فقط', 'error');
  mutate((d) => {
    const iss = d.issues.find((x) => x.id === issueId);
    if (!iss) return;
    if (iss.status === 'closed' && me.role === 'courier') return;
    iss.updates.push({ at: Date.now(), by: me.name, byRole: me.role, note: msg });
  });
}

export function issueReturnAction(me: User, issueId: string, action: 'redeliver' | 'refund') {
  if (!can(me, ['owner', 'ops'])) return toast('صلاحية غير كافية', 'error');
  const iss = state.issues.find((x) => x.id === issueId);
  if (!iss?.orderId) return toast('البلاغ غير مرتبط بطلب', 'error');
  mutate((d) => {
    const i = d.issues.find((x) => x.id === issueId)!;
    const ord = d.orders.find((x) => x.id === i.orderId);
    if (action === 'redeliver' && ord) {
      ord.status = 'assigned';
      touch(ord, ev(me.name, 'قرار الإدارة: إعادة التوصيل للمندوب', 'info'));
      i.updates.push({ at: Date.now(), by: me.name, byRole: me.role, note: 'قرار الإدارة: إعادة توصيل الشحنة للمندوب.', status: 'progress' });
      i.status = 'progress';
    } else {
      if (ord) touch(ord, ev(me.name, `قرار الإدارة: رد مبلغ ${money(ord.cod)} للعميل`, 'warn'));
      i.updates.push({ at: Date.now(), by: me.name, byRole: me.role, note: `قرار الإدارة: رد المبلغ ${money(ord?.cod ?? 0)} للعميل وإغلاق البلاغ.`, status: 'closed' });
      i.status = 'closed';
    }
  });
  toast(action === 'redeliver' ? 'تمت إعادة الطلب للمندوب' : 'تم رد المبلغ وإغلاق البلاغ', action === 'redeliver' ? 'info' : 'success');
}

// ── إجراءات: التحصيل والتسويات ──
export function courierCollected(db: DB, courierId: string) {
  // استبعاد الطلبات الأونلاين من حسابات COD
  const orders = db.orders.filter((o) => o.courierId === courierId && o.paymentType === 'cod' && ['handed', 'on_way', 'arrived', 'assigned'].includes(o.status));
  const amount = orders.reduce((s, o) => s + o.cod, 0);
  const allDelivered = db.orders.filter((o) => o.courierId === courierId && o.paymentType === 'cod' && o.status === 'delivered');
  return { orders, amount, allDeliveredAmount: allDelivered.reduce((s, o) => s + o.cod, 0) };
}

export function createSettlement(me: User, courierId: string, fees: number, adjustments: { label: string; amount: number }[]) {
  if (!can(me, ['owner', 'finance'])) return toast('صلاحية غير كافية', 'error');
  const { orders, amount } = courierCollected(state, courierId);
  if (orders.length === 0 && amount === 0) return toast('لا توجد مبالغ معلقة لهذا المندوب', 'error');
  const adjTotal = adjustments.reduce((s, a) => s + a.amount, 0);
  const net = amount - fees + adjTotal;
  const id = uid();
  mutate((d) => {
    d.settlements.unshift({
      id, courierId, orderIds: orders.map((o) => o.id), base: amount, fees, adjustments, net,
      status: 'pending', createdAt: Date.now(), by: me.name,
    });
    d.orders.forEach((o) => { if (orders.some((x) => x.id === o.id)) o.settlementId = id; });
  });
  toast(`تم إنشاء تسوية بقيمة ${money(net)} — بانتظار الاعتماد`);
}

export function settleSettlement(me: User, id: string) {
  if (!can(me, ['owner', 'finance'])) return toast('صلاحية غير كافية', 'error');
  mutate((d) => {
    const s = d.settlements.find((x) => x.id === id);
    if (s && s.status === 'pending') { s.status = 'settled'; s.settledAt = Date.now(); }
  });
  toast('تم اعتماد التسوية');
}

// ── الاتصال الميداني ──
export function toggleOnline(me: User) {
  const turningOn = !me.online;
  mutate((d) => {
    const u = d.users.find((x) => x.id === me.id);
    if (u) u.online = turningOn;
  });
  if (turningOn) {
    const z = state.routes.find((r) => r.courierIds.includes(me.id))?.zoneId;
    const zz = zoneById(z ?? '');
    mutate((d) => {
      d.positions[me.id] = {
        x: (zz?.x ?? 50) + (Math.random() * 2 - 1), y: (zz?.y ?? 30) + (Math.random() * 2 - 1),
        tx: zz?.x ?? 48, ty: zz?.y ?? 28, lastAt: Date.now(),
      };
    }, { sync: false });
  }
  toast(turningOn ? 'أنت متصل الآن — موقعك ظاهر لغرفة العمليات' : 'تم إيقاف الاتصال', turningOn ? 'success' : 'info');
}

// ── محرك مواقع المندوبين: تحديث كل 15 ثانية ──
export function startLiveEngine() {
  const tick = () => {
    if (!state.users.some((u) => u.role === 'courier' && u.online)) return;
    mutate((d) => {
      const now = Date.now();
      for (const u of d.users) {
        if (u.role !== 'courier' || !u.online) continue;
        let p = d.positions[u.id];
        if (!p) { p = { x: 50, y: 30, tx: 48, ty: 28, lastAt: now }; d.positions[u.id] = p; }
        const active = d.orders
          .filter((o) => o.courierId === u.id && ['handed', 'on_way', 'arrived'].includes(o.status))
          .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (active) { p.tx = active.x; p.ty = active.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.2) {
          if (!active) { p.tx = 36 + Math.random() * 34; p.ty = 8 + Math.random() * 46; }
        } else {
          const step = 1.6 + Math.random() * 1.6;
          p.x += (dx / dist) * Math.min(dist, step) + (Math.random() - 0.5) * 0.5;
          p.y += (dy / dist) * Math.min(dist, step) + (Math.random() - 0.5) * 0.5;
        }
        p.lastAt = now;
      }
    }, { sync: false });
    if (remoteReady) {
      const rows = state.users
        .filter((u) => u.role === 'courier' && u.online && state.positions[u.id])
        .map((u) => posToRow(u.id, state.positions[u.id]));
      if (rows.length) upsertRows('positions', rows).catch(() => { /* صامت */ });
    }
  };
  const t = setInterval(tick, 15000);
  tick();
  return () => clearInterval(t);
}

export type { DB, User, Order, Issue, Settlement };
export { BASE_OWNER_ID };
