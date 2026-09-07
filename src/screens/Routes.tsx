import { useState } from 'react';
import { Search, Plus, Pencil, Route as RouteIcon, Bike, Banknote } from 'lucide-react';
import { useDB, useMe, addRoute, setRouteCouriers, updateRouteDeliveryFee } from '../lib/store';
import { ZONES, money } from '../lib/data';
import type { Route, User } from '../lib/data';
import { Btn, Modal, Field, Input, Empty, Avatar, Badge, CodeChip } from '../ui/kit';

export default function Routes() {
  const db = useDB();
  const me = useMe()!;
  const [tab, setTab] = useState<'zones' | 'custom'>('zones');
  const [assignFor, setAssignFor] = useState<Route | null>(null);
  const [editFeeFor, setEditFeeFor] = useState<Route | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState('');
  const canEdit = ['owner', 'ops'].includes(me.role);
  const isOwner = me.role === 'owner';

  const zoneRoutes = db.routes.filter((r) => !r.custom);
  const customRoutes = db.routes.filter((r) => r.custom);
  const needle = q.trim().toLowerCase();
  const shown = (tab === 'zones' ? zoneRoutes : customRoutes)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.code.toLowerCase().includes(needle));

  const statsFor = (r: Route) => {
    const orders = r.zoneId ? db.orders.filter((o) => o.zoneId === r.zoneId) : [];
    return {
      open: orders.filter((o) => !['delivered', 'failed', 'returned'].includes(o.status)).length,
      deliveredToday: orders.filter((o) => o.status === 'delivered' && Date.now() - o.updatedAt < 864e5).length,
      total: orders.length,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
          <Input placeholder="ابحث عن مسار بالاسم أو الكود…" className="ps-9 py-1.5 text-xs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex bg-white ring-1 ring-slate-300/70 rounded-md p-0.5">
          {([['zones', `مسارات المناطق (${zoneRoutes.length})`], ['custom', `مسارات مخصصة (${customRoutes.length})`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all ${tab === k ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 ms-1 hidden lg:block">كل منطقة من مناطق التغطية الـ{ZONES.length} تعمل كمسار قائم بذاته، ويتسع المسار لأكثر من مندوب.</p>
        {canEdit && tab === 'custom' && (
          <Btn sm icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)} className="ms-auto">مسار مخصص</Btn>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-lg ring-1 ring-slate-900/8">
          <Empty icon={<RouteIcon className="w-8 h-8" strokeWidth={1.4} />} title={needle ? 'لا مسارات تطابق البحث' : 'لا توجد مسارات مخصصة'} sub={needle ? undefined : 'أنشئ مسارًا خاصًا بخط سير معين ووزّع عليه المندوبين'}
            action={canEdit && !needle ? <Btn v="soft" sm onClick={() => setShowNew(true)}>إنشاء مسار</Btn> : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {shown.map((r, i) => {
            const s = statsFor(r);
            const zone = ZONES.find((z) => z.id === r.zoneId);
            return (
              <article key={r.id} className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-up flex flex-col" style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${r.custom ? 'bg-petrol-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <RouteIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-ink truncate">{r.name}</h3>
                      <span className="text-[10px] text-slate-400">{zone ? (zone.region === 'qalyubia' ? 'القليوبية' : 'القاهرة') : 'مسار يدوي'}</span>
                    </div>
                  </div>
                  <CodeChip code={r.code} />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-bold text-slate-500">المندوبون:</span>
                  {r.courierIds.length ? (
                    <span className="flex -space-x-1.5" dir="ltr">
                      {r.courierIds.map((cid) => {
                        const u = db.users.find((x) => x.id === cid);
                        return u ? <Avatar key={cid} id={cid} name={u.name} size="w-6 h-6 text-[8px]" /> : null;
                      })}
                    </span>
                  ) : <span className="text-[10px] text-slate-400">لا يوجد</span>}
                  {canEdit && (
                    <button onClick={() => setAssignFor(r)} className="ms-auto text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                      <Pencil className="w-3 h-3" /> توزيع
                    </button>
                  )}
                </div>

                {/* قيمة التوصيل */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-slate-500">قيمة التوصيل:</span>
                    <span className="num text-sm font-bold text-emerald-700">{money(r.deliveryFee)}</span>
                  </div>
                  {isOwner && (
                    <button onClick={() => setEditFeeFor(r)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                      <Pencil className="w-3 h-3" /> تعديل
                    </button>
                  )}
                </div>

                {r.zoneId && (
                  <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-100 text-center">
                    <div><div className="num text-sm font-bold text-ink">{s.total}</div><div className="text-[9px] text-slate-400 font-semibold">إجمالي</div></div>
                    <div><div className="num text-sm font-bold text-brand-600">{s.open}</div><div className="text-[9px] text-slate-400 font-semibold">نشط</div></div>
                    <div><div className="num text-sm font-bold text-emerald-600">{s.deliveredToday}</div><div className="text-[9px] text-slate-400 font-semibold">سُلّم اليوم</div></div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {assignFor && <AssignCouriers route={assignFor} me={me} onClose={() => setAssignFor(null)} />}
      {editFeeFor && <EditDeliveryFeeModal route={editFeeFor} me={me} onClose={() => setEditFeeFor(null)} />}
      {showNew && <NewRouteModal me={me} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function AssignCouriers({ route, me, onClose }: { route: Route; me: User; onClose: () => void }) {
  const db = useDB();
  const [sel, setSel] = useState<string[]>(route.courierIds);
  const couriers = db.users.filter((u) => u.role === 'courier');
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal open onClose={onClose} title={`مندوبو ${route.name}`} w="max-w-md"
      icon={<Bike className="w-5 h-5" />} desc="وزّع المندوبين على هذا المسار">
      <p className="text-xs text-slate-500 mb-3">يمكن إسناد أكثر من مندوب لنفس المسار في نفس الوردية.</p>
      {couriers.length === 0 ? (
        <Empty icon={<Bike className="w-8 h-8" strokeWidth={1.4} />} title="لا يوجد مندوبون" sub="أضف مندوبين من إدارة الفريق أولًا" />
      ) : (
        <div className="space-y-1.5">
          {couriers.map((c) => {
            const on = sel.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className={`w-full flex items-center gap-2.5 rounded-md ring-1 px-3 py-2 text-start transition-all ${on ? 'ring-brand-500 bg-brand-50' : 'ring-slate-200 bg-white hover:ring-slate-300'}`}>
                <Avatar id={c.id} name={c.name} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-700 truncate">{c.name}</span>
                  <span className="block text-[10px] text-slate-400">{c.online ? 'متصل الآن' : 'غير متصل'}</span>
                </span>
                {on && <Badge className="bg-brand-600 text-white ring-brand-600">على المسار</Badge>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn onClick={() => { setRouteCouriers(me, route.id, sel); onClose(); }}>حفظ التوزيع</Btn>
      </div>
    </Modal>
  );
}

function NewRouteModal({ me, onClose }: { me: User; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState({ name: '', code: '' });
  const [sel, setSel] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const couriers = db.users.filter((u) => u.role === 'courier');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 3) return setErr('أدخل اسم المسار');
    if (!/^[A-Za-z]{2,4}$/.test(f.code.trim())) return setErr('كود المسار: 2-4 حروف لاتينية');
    addRoute(me, { name: f.name.trim(), code: f.code.trim(), courierIds: sel });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="مسار مخصص جديد" w="max-w-md"
      icon={<RouteIcon className="w-5 h-5" />} desc="أنشئ مسارًا يدويًا بكود خاص ووزّع عليه المندوبين">
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="اسم المسار" req>
            <Input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(''); }} placeholder="مسار المولات المسائي" />
          </Field>
          <Field label="الكود" req hint="2-4 حروف">
            <Input dir="ltr" className="num text-center uppercase" value={f.code} onChange={(e) => { setF({ ...f, code: e.target.value }); setErr(''); }} placeholder="MOL" />
          </Field>
        </div>
        {err && <p className="text-[11px] font-semibold text-red-600">{err}</p>}
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">المندوبون على المسار</div>
          <div className="flex flex-wrap gap-1.5">
            {couriers.map((c) => {
              const on = sel.includes(c.id);
              return (
                <button type="button" key={c.id} onClick={() => setSel((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                  className={`flex items-center gap-1.5 rounded-full ps-1 pe-3 py-1 ring-1 text-xs font-semibold transition-all ${on ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-300 hover:ring-slate-400'}`}>
                  <Avatar id={c.id} name={c.name} size="w-5 h-5 text-[8px]" />
                  {c.name}
                </button>
              );
            })}
            {couriers.length === 0 && <span className="text-[11px] text-slate-400">لا مندوبون بعد</span>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" icon={<Plus className="w-4 h-4" />}>إنشاء المسار</Btn>
        </div>
      </form>
    </Modal>
  );
}

function EditDeliveryFeeModal({ route, me, onClose }: { route: Route; me: User; onClose: () => void }) {
  const [fee, setFee] = useState(String(route.deliveryFee));
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(fee);
    if (isNaN(num) || num < 0) return setErr('قيمة غير صالحة');
    updateRouteDeliveryFee(me, route.id, num);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`تعديل قيمة التوصيل — ${route.name}`} w="max-w-sm"
      icon={<Banknote className="w-5 h-5" />} desc="حدد قيمة خدمة التوصيل لهذه المنطقة">
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="قيمة التوصيل (ج.م)" error={err}>
          <Input dir="ltr" className="num text-left text-lg font-bold" type="number" min={0} step={0.5}
            value={fee} onChange={(e) => { setFee(e.target.value); setErr(''); }} placeholder="0" />
        </Field>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          <div className="font-bold mb-1">💡 ملاحظة</div>
          <div className="text-xs">هذه القيمة هي تكلفة التوصيل للعميل في هذه المنطقة. سيتم إضافتها تلقائيًا عند إنشاء طلب جديد.</div>
        </div>
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" icon={<Banknote className="w-4 h-4" />}>حفظ القيمة</Btn>
        </div>
      </form>
    </Modal>
  );
}
