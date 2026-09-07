import { useMemo, useState } from 'react';
import {
  Search, Plus, Trash2, Bike, RefreshCw, Check, PackageOpen, Warehouse, QrCode,
} from 'lucide-react';
import {
  useDB, useMe, createOrder, assignCourier, openCodeForCourier, deleteOrder, markReturned,
} from '../lib/store';
import { STATUS_META, STATUS_FLOW, ZONES, zoneById, money, timeAgo, fmtFull } from '../lib/data';
import type { Order, OrderStatus, User } from '../lib/data';
import { Btn, Card, StatusBadge, CodeChip, Chip, Modal, Drawer, Confirm, Field, Input, Select, Textarea, Empty, Avatar, Badge, FormSection } from '../ui/kit';
import { Barcode } from '../ui/camera';
import { scopedOrders } from './Dashboard';

const PIPELINE: OrderStatus[] = ['created', 'assigned', 'handed', 'on_way', 'arrived'];
const TERMINALS: OrderStatus[] = ['delivered', 'failed', 'returned'];
const pathOf = (status: OrderStatus): OrderStatus[] =>
  TERMINALS.includes(status) ? [...PIPELINE, status] : PIPELINE.slice(0, PIPELINE.indexOf(status) + 1);

export default function Orders() {
  const db = useDB();
  const me = useMe()!;
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState<OrderStatus | 'all'>('all');
  const [hubF, setHubF] = useState('all');
  const [routeF, setRouteF] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [assignFor, setAssignFor] = useState<Order | null>(null);
  const [codeFor, setCodeFor] = useState<Order | null>(null);

  const base = scopedOrders(db.orders, me);
  const canCreate = ['owner', 'ops', 'hub'].includes(me.role);
  const activeRoute = routeF === 'all' ? undefined : db.routes.find((r) => r.id === routeF);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return base
      .filter((o) => (statusF === 'all' ? true : o.status === statusF))
      .filter((o) => (hubF === 'all' ? true : o.hubId === hubF))
      .filter((o) => {
        if (!activeRoute) return true;
        if (activeRoute.zoneId) return o.zoneId === activeRoute.zoneId;
        return !!o.courierId && activeRoute.courierIds.includes(o.courierId);
      })
      .filter((o) => !needle || o.customer.toLowerCase().includes(needle) || o.phone.includes(needle) || o.code.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [base, q, statusF, hubF, activeRoute]);

  const open = openId ? db.orders.find((o) => o.id === openId) ?? null : null;
  const counts = (s: OrderStatus) => base.filter((o) => o.status === s).length;

  return (
    <div className="space-y-3">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
          <Input placeholder="بحث باسم العميل / الهاتف / رقم الطلب…" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-40" value={hubF} onChange={(e) => setHubF(e.target.value)}>
          <option value="all">كل المخازن</option>
          {db.hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </Select>
        <Select className="w-40" value={routeF} onChange={(e) => setRouteF(e.target.value)}>
          <option value="all">كل المسارات</option>
          {db.routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
        </Select>
        <span className="text-xs text-slate-500 font-semibold ms-auto">
          <span className="num">{filtered.length}</span> طلب
        </span>
        {canCreate && (
          <Btn icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>طلب جديد</Btn>
        )}
      </div>

      {/* رقائق الحالات */}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={statusF === 'all'} onClick={() => setStatusF('all')} count={base.length}>الكل</Chip>
        {STATUS_FLOW.map((s) => counts(s) > 0 && (
          <Chip key={s} active={statusF === s} onClick={() => setStatusF(statusF === s ? 'all' : s)} count={counts(s)}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </Chip>
        ))}
      </div>

      {/* الجدول */}
      <Card pad={false}>
        {filtered.length === 0 ? (
          <Empty
            icon={<PackageOpen className="w-8 h-8" strokeWidth={1.4} />}
            title={q ? 'لا نتائج مطابقة لبحثك' : 'لا توجد طلبات بهذه الحالة'}
            sub="جرّب تعديل البحث أو الفلاتر، أو أنشئ طلبًا جديدًا"
            action={canCreate ? <Btn v="soft" sm icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>طلب جديد</Btn> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100">
                  <th className="text-start font-bold px-4 py-2.5">الكود</th>
                  <th className="text-start font-bold px-3 py-2.5">العميل</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden md:table-cell">المنطقة</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden lg:table-cell">المخزن</th>
                  <th className="text-start font-bold px-3 py-2.5">COD</th>
                  <th className="text-start font-bold px-3 py-2.5">الحالة</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden xl:table-cell">المندوب</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden sm:table-cell">آخر تحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenId(o.id)}
                    className="cursor-pointer hover:bg-brand-50/50 transition-colors animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  >
                    <td className="px-4 py-2.5"><CodeChip code={o.code} /></td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-800">{o.customer}</div>
                      <div className="num text-[11px] text-slate-500" dir="ltr">{o.phone}</div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-slate-600">{zoneById(o.zoneId)?.name}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-slate-600 text-xs">{db.hubs.find((h) => h.id === o.hubId)?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {o.paymentType === 'online' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 ring-1 ring-sky-600/25 rounded-full px-2 py-0.5">
                          💳 أونلاين
                        </span>
                      ) : o.cod > 0 ? (
                        <span className="num text-xs font-bold text-brand-700">{money(o.cod)}</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge s={o.status} /></td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      {o.courierId ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Avatar id={o.courierId} name={db.users.find((u) => u.id === o.courierId)?.name ?? '؟'} size="w-6 h-6 text-[9px]" />
                          {db.users.find((u) => u.id === o.courierId)?.name ?? 'محذوف'}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell text-[11px] text-slate-500">{timeAgo(o.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* التفاصيل */}
      {open && (
        <OrderDrawer
          order={open}
          me={me}
          onClose={() => setOpenId(null)}
          onShowCode={() => setCodeFor(open)}
          onAssign={() => setAssignFor(open)}
          onDelete={() => setToDelete(open)}
        />
      )}

      {/* إنشاء */}
      {showNew && <NewOrderModal me={me} onClose={() => setShowNew(false)} />}

      {/* حذف */}
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onYes={() => { if (toDelete) { deleteOrder(me, toDelete.id); setOpenId(null); } }}
        title="حذف طلب نهائيًا"
        msg={<>سيُحذف الطلب <b className="num" dir="ltr">{toDelete?.code}</b> الخاص بـ<b>{toDelete?.customer}</b> وكل سجله الزمني من قاعدة البيانات المشتركة. هذا الإجراء لا يمكن التراجع عنه.</>}
      />

      {/* إسناد */}
      {assignFor && <AssignModal order={assignFor} me={me} onClose={() => setAssignFor(null)} />}

      {/* عرض كود التتبع للمندوب */}
      {codeFor && <ShowCodeModal order={codeFor} onClose={() => setCodeFor(null)} />}
    </div>
  );
}

// ── الدرج التفصيلي ──
function OrderDrawer({ order, me, onClose, onShowCode, onAssign, onDelete }: {
  order: Order; me: User; onClose: () => void;
  onShowCode: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const db = useDB();
  const zone = zoneById(order.zoneId);
  const hub = db.hubs.find((h) => h.id === order.hubId);
  const courier = order.courierId ? db.users.find((u) => u.id === order.courierId) : undefined;
  const path = pathOf(order.status);
  const isHubStaff = me.role === 'hub' && me.hubIds.includes(order.hubId);
  const isMgr = ['owner', 'ops'].includes(me.role);

  return (
    <Drawer open onClose={onClose}>
      <header className="bg-ink text-white px-5 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="num text-brand-300 font-bold text-lg tracking-wider" dir="ltr">{order.code}</span>
            <StatusBadge s={order.status} />
          </div>
          <h2 className="font-display text-xl font-bold mt-1 truncate">{order.customer}</h2>
          <div className="text-[11px] text-slate-400 mt-0.5">أُنشئ {fmtFull(order.createdAt)} · آخر تحديث {timeAgo(order.updatedAt)}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-colors" aria-label="إغلاق">
          <XIcon />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <div className="space-y-4 min-w-0">
            {/* بيانات العميل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoTile label="الهاتف" value={<span className="num" dir="ltr">{order.phone}</span>} />
              <InfoTile label="المنطقة" value={zone?.name ?? '—'} />
              <InfoTile label="مخزن الفرز" value={hub?.name ?? '—'} />
              <InfoTile label="قيمة COD" value={order.cod > 0 ? money(order.cod) : 'بدون تحصيل'} highlight={order.cod > 0} />
            </div>
            <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5">
              <div className="text-[11px] font-bold text-slate-500 mb-1">العنوان الكامل</div>
              <div className="text-sm font-semibold text-slate-800 leading-6">{order.address}</div>
            </div>

            {order.recipientName && (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 rounded-md px-3 py-2.5">
                <Check className="w-4 h-4" /> سلَّم المندوب الشحنة إلى: {order.recipientName}
              </div>
            )}
            {order.status === 'failed' && order.failReason && (
              <div className="text-sm bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2.5">
                <div className="font-bold text-red-700">سبب الفشل: {order.failReason}</div>
                {order.failNote && <div className="text-xs text-red-600 mt-1">{order.failNote}</div>}
              </div>
            )}
            {order.pod && (
              <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5">
                <div className="text-[11px] font-bold text-slate-500 mb-2">صورة إثبات التسليم</div>
                <img src={order.pod} alt="إثبات التسليم" className="w-full max-w-60 rounded-md ring-1 ring-slate-200" />
              </div>
            )}

            {/* الباركود */}
            <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4">
              <div className="text-[11px] font-bold text-slate-500 mb-2">ملصق التتبع</div>
              <Barcode code={order.code} className="h-12 max-w-72 mx-auto" />
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            {/* مراحل التتبع */}
            <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4">
              <div className="text-[11px] font-bold text-slate-500 mb-3">مراحل التتبع ({path.length})</div>
              <ol>
                {path.map((s, i) => {
                  const isLast = i === path.length - 1;
                  const m = STATUS_META[s];
                  return (
                    <li key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`w-3 h-3 rounded-full ring-4 ${isLast ? m.dot : 'bg-slate-300 ring-transparent'}`} style={isLast ? { boxShadow: `0 0 0 4px ${m.hex}22` } : undefined} />
                        {!isLast && <span className="w-px flex-1 bg-slate-200 min-h-3" />}
                      </div>
                      <div className={`pb-3 ${isLast ? '' : 'opacity-70'}`}>
                        <div className={`text-sm font-bold ${isLast ? 'text-ink' : 'text-slate-600'}`}>{m.label}</div>
                        <div className="text-[10px] text-slate-400 num">{fmtFull(order.timeline[i]?.at ?? order.createdAt)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* السجل الزمني */}
            <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4">
              <div className="text-[11px] font-bold text-slate-500 mb-3">السجل الزمني الكامل</div>
              <div className="space-y-2.5">
                {[...order.timeline].reverse().map((e, i) => (
                  <div key={i} className="flex gap-2.5 text-sm animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${e.kind === 'ok' ? 'bg-emerald-500' : e.kind === 'bad' ? 'bg-red-500' : e.kind === 'warn' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-[13px]">{e.label}</div>
                      {e.note && <div className="text-xs text-slate-500">{e.note}</div>}
                      <div className="text-[10px] text-slate-400">{e.by} · {fmtFull(e.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* لوحة الإجراءات */}
      <footer className="border-t border-slate-200 bg-white p-4 space-y-2 pb-safe">
        {isMgr && order.status === 'created' && (
          <ActionRow title="طلب جديد — أسنده لمندوب ليظهر في تطبيقه ويستلمه بمسح الكود">
            <Btn icon={<Bike className="w-4 h-4" />} onClick={onAssign}>إسناد لمندوب</Btn>
          </ActionRow>
        )}
        {(isHubStaff || isMgr) && order.status === 'assigned' && (
          <ActionRow title={`مُسند إلى ${courier?.name ?? 'المندوب'} — افتح كود التتبع ليمسحه من تطبيقه ويستلم الشحنة`}>
            <div className="flex gap-2">
              <Btn icon={<QrCode className="w-4 h-4" />} onClick={() => { openCodeForCourier(me, order.id); onShowCode(); }}>فتح كود التتبع للمندوب</Btn>
              {isMgr && (
                <Btn v="ghost" icon={<RefreshCw className="w-4 h-4" />} onClick={onAssign}>تغيير المندوب</Btn>
              )}
            </div>
          </ActionRow>
        )}
        {isMgr && order.status === 'failed' && (
          <ActionRow title="الشحنة فشل تسليمها — يمكن تحويلها لمرتجع">
            <Btn v="dark" icon={<RefreshCw className="w-4 h-4" />} onClick={() => markReturned(me, order.id)}>تحويل لمرتجع</Btn>
          </ActionRow>
        )}
        {isMgr && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] text-slate-400">إجراء إداري</span>
            <Btn v="ghost" sm icon={<Trash2 className="w-4 h-4" />} className="text-red-600 hover:bg-red-50" onClick={onDelete}>حذف الطلب</Btn>
          </div>
        )}
        {!isHubStaff && !isMgr && (
          <p className="text-xs text-slate-500 text-center py-1">لا توجد إجراءات متاحة لدورك على هذه الحالة.</p>
        )}
        {isHubStaff && order.status !== 'assigned' && (
          <p className="text-xs text-slate-500 text-center py-1">
            {order.status === 'created' ? 'بانتظار إسناد المشرف للمندوب — بعدها تفتح كود التتبع ليستلمه.' : 'الشحنة الآن مع المندوب — المتابعة من تطبيقه.'}
          </p>
        )}
        {isMgr && !['created', 'assigned', 'failed'].includes(order.status) && (
          <p className="text-xs text-slate-400 text-center">الحالة الحالية تُدار من شاشة المندوب.</p>
        )}
      </footer>
    </Drawer>
  );
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const InfoTile = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div className={`rounded-lg ring-1 p-3 ${highlight ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-slate-900/8'}`}>
    <div className="text-[10px] font-bold text-slate-500">{label}</div>
    <div className={`text-sm font-bold truncate ${highlight ? 'text-brand-700 num' : 'text-slate-800'}`}>{value}</div>
  </div>
);

const ActionRow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50/70 ring-1 ring-brand-200 rounded-lg px-3.5 py-2.5">
    <span className="text-xs font-semibold text-brand-800">{title}</span>
    {children}
  </div>
);

// ── إنشاء طلب ──
function NewOrderModal({ me, onClose }: { me: User; onClose: () => void }) {
  const db = useDB();
  const isHubStaff = me.role === 'hub';
  const myHubs = isHubStaff ? db.hubs.filter((h) => me.hubIds.includes(h.id)) : db.hubs;
  const [f, setF] = useState({ customer: '', phone: '', address: '', zoneId: ZONES[8].id, cod: '', hubId: '', paymentType: 'cod' as 'cod' | 'online' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [zoneChanged, setZoneChanged] = useState(false);

  const hubForZone = (zid: string) => myHubs.find((h) => h.zoneId === zid)?.id ?? myHubs[0]?.id ?? '';
  const zone = zoneById(f.zoneId);
  const previewCode = `${zone?.code}-${String((db.seq[zone?.code ?? ''] ?? 0) + 1).padStart(4, '0')}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.customer.trim().length < 3) er.customer = 'أدخل اسم العميل كاملًا';
    if (!/^01\d{9}$/.test(f.phone.trim())) er.phone = 'رقم مصري من 11 رقم يبدأ بـ 01';
    if (f.address.trim().length < 6) er.address = 'أدخل عنوانًا تفصيليًا للتوصيل';
    const hubId = zoneChanged && f.hubId ? f.hubId : hubForZone(f.zoneId);
    if (!hubId) er.hubId = 'اختر مخزن الفرز';
    const cod = f.paymentType === 'online' ? 0 : Number(f.cod || 0);
    if (f.paymentType === 'cod' && (Number.isNaN(cod) || cod < 0)) er.cod = 'قيمة غير صالحة';
    setErrs(er);
    if (Object.keys(er).length) return;
    createOrder(me, {
      customer: f.customer.trim(), phone: f.phone.trim(), address: f.address.trim(),
      zoneId: f.zoneId, cod, hubId, paymentType: f.paymentType,
    });
    onClose();
  };

  if (isHubStaff && myHubs.length === 0) {
    return (
      <Modal open onClose={onClose} title="طلب شحن جديد" w="max-w-md" icon={<Warehouse className="w-5 h-5" />}>
        <Empty icon={<Warehouse className="w-8 h-8" strokeWidth={1.4} />} title="لست مربوطًا بأي مخزن"
          sub="اطلب من مشرف العمليات ربطك بمخزن من شاشة المخازن لتتمكن من إنشاء الطلبات" />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="طلب شحن جديد" w="max-w-xl"
      icon={<Plus className="w-5 h-5" />} desc="أنشئ شحنة جديدة — سيُولَّد لها كود تتبّع تلقائي ببادئة المنطقة"
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" form="new-order-form" icon={<Plus className="w-4 h-4" />}>إنشاء الطلب</Btn>
        </div>
      }>
      <form id="new-order-form" onSubmit={submit} className="space-y-3.5">
        <FormSection label="بيانات العميل" />
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="اسم العميل" req error={errs.customer}>
            <Input value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} placeholder="مثال: سامح نبيل" />
          </Field>
          <Field label="رقم الهاتف" req error={errs.phone}>
            <Input dir="ltr" className="num text-left" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" />
          </Field>
        </div>
        <Field label="العنوان التفصيلي" req error={errs.address}>
          <Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="الشارع، رقم العمارة، الدور، علامة مميزة…" />
        </Field>

        <FormSection label="التوجيه والتحصيل" />
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="منطقة التغطية" hint={`كود التتبع: ${previewCode}`}>
            <Select value={f.zoneId} onChange={(e) => { setF({ ...f, zoneId: e.target.value }); setZoneChanged(true); }}>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
            </Select>
          </Field>
          <Field label="مخزن الفرز" error={errs.hubId} hint={isHubStaff ? 'مقيّد بمخازنك' : undefined}>
            <Select value={zoneChanged ? f.hubId : hubForZone(f.zoneId)} onChange={(e) => { setF({ ...f, hubId: e.target.value }); setZoneChanged(true); }} disabled={isHubStaff && myHubs.length === 1}>
              {myHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
        </div>

        <FormSection label="طريقة الدفع" />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setF({ ...f, paymentType: 'cod' })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              f.paymentType === 'cod'
                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="text-3xl">💵</span>
            <div className="text-right">
              <div className="font-bold text-sm">نقدي (COD)</div>
              <div className="text-xs text-slate-500">التحصيل عند التسليم</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setF({ ...f, paymentType: 'online', cod: '' })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              f.paymentType === 'online'
                ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="text-3xl">💳</span>
            <div className="text-right">
              <div className="font-bold text-sm">أونلاين</div>
              <div className="text-xs text-slate-500">مدفوع مسبقًا</div>
            </div>
          </button>
        </div>

        {f.paymentType === 'cod' && (
          <Field label="قيمة التحصيل (COD)" error={errs.cod} hint="0 = بدون تحصيل">
            <Input dir="ltr" className="num text-left" type="number" min={0} value={f.cod} onChange={(e) => setF({ ...f, cod: e.target.value })} placeholder="450" />
          </Field>
        )}

        {f.paymentType === 'online' && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-800">
            <div className="font-bold mb-1">💳 الدفع الأونلاين</div>
            <div className="text-xs">هذا الطلب مدفوع مسبقًا ولن يظهر في حسابات التسوية النقدية.</div>
          </div>
        )}
        {isHubStaff && (
          <div className="flex items-center gap-2 text-[11px] font-semibold text-sky-800 bg-sky-50 ring-1 ring-sky-200 rounded-md px-3 py-2">
            <Warehouse className="w-4 h-4 shrink-0" />
            ستُنشأ الطلبات في {myHubs.length === 1 ? `مخزن ${myHubs[0].name} فقط` : `مخازنك المرتبطة (${myHubs.length})`}
          </div>
        )}
        <div className="flex items-center justify-between bg-slate-50 rounded-md px-3.5 py-2.5 ring-1 ring-slate-200">
          <span className="text-xs text-slate-500">كود تتابعي تلقائي ببادئة <b>{zone?.name}</b></span>
          <Badge className="bg-ink text-brand-300 ring-ink"><span className="num" dir="ltr">{previewCode}</span></Badge>
        </div>
      </form>
    </Modal>
  );
}

// ── عرض كود التتبع للمندوب ──
function ShowCodeModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const courier = order.courierId ? undefined : undefined;
  void courier;
  return (
    <Modal open onClose={onClose} title={`كود تتبّع ${order.customer}`} w="max-w-md"
      icon={<QrCode className="w-5 h-5" />} desc="اعرض هذا الملصق على المندوب ليمسحه من تطبيقه ويستلم الشحنة">
      <div className="text-center">
        <div className="bg-white rounded-lg ring-1 ring-slate-200 p-5">
          <Barcode code={order.code} className="h-16" />
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-5">
          الحالة ستنتقل تلقائيًا إلى «مُسلَّم للمندوب» بمجرد مسحه للكود من تطبيقه.
        </p>
      </div>
    </Modal>
  );
}

// ── إسناد / تغيير مندوب ──
function AssignModal({ order, me, onClose }: { order: Order; me: User; onClose: () => void }) {
  const db = useDB();
  const isReassign = order.status === 'assigned' && !!order.courierId;
  const [cid, setCid] = useState(order.courierId ?? '');
  const couriers = db.users.filter((u) => u.role === 'courier');
  const routeCouriers = db.routes.find((r) => r.zoneId === order.zoneId)?.courierIds ?? [];

  const submit = () => {
    if (!cid || cid === order.courierId) return;
    assignCourier(me, order.id, cid);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isReassign ? `تغيير مندوب ${order.code}` : `إسناد ${order.code} لمندوب`} w="max-w-md"
      icon={<Bike className="w-5 h-5" />} desc={isReassign ? 'اختر مندوبًا آخر لاستلام الشحنة' : 'اختر المندوب الذي سيستلم الشحنة ويوصّلها'}
      footer={
        <div className="flex justify-end gap-2">
          <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn disabled={!cid || cid === order.courierId} icon={<Check className="w-4 h-4" />} onClick={submit}>
            {isReassign ? 'تأكيد التغيير' : 'تأكيد الإسناد'}
          </Btn>
        </div>
      }>
      {couriers.length === 0 ? (
        <Empty icon={<Bike className="w-8 h-8" strokeWidth={1.4} />} title="لا يوجد مندوبون" sub="أضف مندوبين من إدارة الفريق أولًا" />
      ) : (
        <div className="space-y-1.5">
          {couriers.map((c) => {
            const suggested = routeCouriers.includes(c.id);
            const active = db.orders.filter((o) => o.courierId === c.id && ['handed', 'on_way', 'arrived'].includes(o.status)).length;
            return (
              <button
                key={c.id}
                onClick={() => setCid(c.id)}
                className={`w-full flex items-center gap-3 rounded-lg ring-1 px-3 py-2.5 transition-all text-start ${cid === c.id ? 'ring-brand-500 bg-brand-50' : 'ring-slate-200 hover:ring-slate-300 bg-white'}`}
              >
                <Avatar id={c.id} name={c.name} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{c.name}</span>
                  <span className="block text-[11px] text-slate-500">{active} طلب نشط · {c.online ? 'متصل الآن' : 'غير متصل'}</span>
                </span>
                <span className="flex items-center gap-1">
                  {order.courierId === c.id && <Badge className="bg-amber-50 text-amber-800 ring-amber-600/25">الحالي</Badge>}
                  {suggested && <Badge className="bg-petrol-100 text-petrol-700 ring-petrol-500/30">مندوب المنطقة</Badge>}
                </span>
                <span className={`w-4 h-4 rounded-full ring-2 flex items-center justify-center ${cid === c.id ? 'ring-brand-500 bg-brand-500' : 'ring-slate-300'}`}>
                  {cid === c.id && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
