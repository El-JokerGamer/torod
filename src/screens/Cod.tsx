import { useState } from 'react';
import { Search, Bike, FileText, Check, Clock, Plus, Minus, Banknote } from 'lucide-react';
import { useDB, useMe, courierCollected, createSettlement, settleSettlement } from '../lib/store';
import { money, fmtFull, timeAgo } from '../lib/data';
import type { Settlement, User } from '../lib/data';
import { Btn, Card, Modal, Field, Input, Empty, Avatar, Badge, Confirm } from '../ui/kit';

export default function Cod() {
  const db = useDB();
  const me = useMe()!;
  const [settleFor, setSettleFor] = useState<User | null>(null);
  const [toSettle, setToSettle] = useState<Settlement | null>(null);
  const [q, setQ] = useState('');
  const canSettle = ['owner', 'finance'].includes(me.role);

  const needle = q.trim().toLowerCase();
  const allCouriers = db.users.filter((u) => u.role === 'courier');
  const couriers = allCouriers.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.username.toLowerCase().includes(needle));
  const settlements = db.settlements.filter((s) => {
    if (!needle) return true;
    const c = db.users.find((u) => u.id === s.courierId);
    return (c?.name.toLowerCase().includes(needle) ?? false) || (c?.username.toLowerCase().includes(needle) ?? false);
  });

  // استبعاد الطلبات الأونلاين من حسابات COD
  const codOrders = db.orders.filter((o) => o.paymentType === 'cod');
  const totalCollected = codOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.cod, 0);
  const totalPending = allCouriers.reduce((s, c) => s + courierCollected({ ...db, orders: codOrders }, c.id).amount, 0);
  const settledSum = db.settlements.filter((s) => s.status === 'settled').reduce((s, x) => s + x.net, 0);

  return (
    <div className="space-y-4">
      <div className="bg-ink text-white rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-60 pointer-events-none" />
        {[
          { label: 'إجمالي المُحصَّل (مسلَّم)', value: money(totalCollected), cls: 'text-emerald-300' },
          { label: 'معلّق لدى المندوبين', value: money(totalPending), cls: 'text-brand-300' },
          { label: 'تسويات معتمدة', value: money(settledSum), cls: 'text-sky-300' },
        ].map((s) => (
          <div key={s.label} className="relative">
            <div className="text-[11px] font-semibold text-slate-400">{s.label}</div>
            <div className={`font-display text-2xl font-bold num mt-1 ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <h3 className="font-display font-bold text-ink text-base flex items-center gap-2">
            <Bike className="w-5 h-5 text-brand-600" /> التحصيل حسب المندوب
          </h3>
          <div className="relative ms-auto w-full sm:w-64">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
            <Input placeholder="ابحث عن مندوب بالاسم أو اسم المستخدم…" className="ps-9 py-1.5 text-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {couriers.length === 0 ? (
          <div className="bg-white rounded-lg ring-1 ring-slate-900/8">
            <Empty icon={<Bike className="w-8 h-8" strokeWidth={1.4} />} title={needle ? 'لا مندوب يطابق البحث' : 'لا يوجد مندوبون'} sub={needle ? 'جرّب اسمًا آخر' : 'أضف مندوبين من إدارة الفريق لمتابعة تحصيلهم'} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {couriers.map((c, i) => {
              const col = courierCollected(db, c.id);
              return (
                <article key={c.id} className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4 hover:shadow-md transition-all animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-2.5">
                    <Avatar id={c.id} name={c.name} size="w-10 h-10 text-xs" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-ink truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.online ? 'متصل' : 'غير متصل'} · {db.orders.filter((o) => o.courierId === c.id && o.status === 'delivered').length} تسليم ناجح</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-slate-50 rounded-md px-2.5 py-2">
                      <div className="text-[9px] font-bold text-slate-400">مُحصَّل ومُسوّى</div>
                      <div className="num text-sm font-bold text-emerald-700">{money(col.allDeliveredAmount - col.amount)}</div>
                    </div>
                    <div className="bg-brand-50 rounded-md px-2.5 py-2 ring-1 ring-brand-200">
                      <div className="text-[9px] font-bold text-brand-600">معلّق ({col.orders.length} طلب)</div>
                      <div className="num text-sm font-bold text-brand-700">{money(col.amount)}</div>
                    </div>
                  </div>
                  {canSettle && (
                    <Btn sm className="w-full mt-3" v={col.orders.length ? 'primary' : 'ghost'} disabled={!col.orders.length}
                      icon={<FileText className="w-4 h-4" />} onClick={() => setSettleFor(c)}>
                      إنشاء تسوية
                    </Btn>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Card title="سجل التسويات" sub="كل التسويات المالية المنشأة للمندوبين" pad={false}>
        {settlements.length === 0 ? (
          <Empty icon={<FileText className="w-8 h-8" strokeWidth={1.4} />} title={needle ? 'لا تسويات تطابق البحث' : 'لا توجد تسويات بعد'} sub={needle ? 'جرّب اسم مندوب آخر' : 'أنشئ أول تسوية من بطاقة المندوب أعلاه'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100">
                  <th className="text-start font-bold px-4 py-2.5">المندوب</th>
                  <th className="text-start font-bold px-3 py-2.5">التاريخ</th>
                  <th className="text-start font-bold px-3 py-2.5">الطلبات</th>
                  <th className="text-start font-bold px-3 py-2.5">المحصَّل</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden md:table-cell">الرسوم</th>
                  <th className="text-start font-bold px-3 py-2.5">الصافي</th>
                  <th className="text-start font-bold px-3 py-2.5">الحالة</th>
                  {canSettle && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => {
                  const c = db.users.find((u) => u.id === s.courierId);
                  return (
                    <tr key={s.id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 font-bold text-slate-800">
                          {c ? <Avatar id={c.id} name={c.name} size="w-6 h-6 text-[9px]" /> : null}
                          {c?.name ?? 'مندوب محذوف'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500" title={fmtFull(s.createdAt)}>{timeAgo(s.createdAt)}</td>
                      <td className="px-3 py-2.5 num text-xs text-slate-600">{s.orderIds.length}</td>
                      <td className="px-3 py-2.5 num font-bold text-slate-800">{money(s.base)}</td>
                      <td className="px-3 py-2.5 num text-xs text-red-600 hidden md:table-cell">- {money(s.fees)}</td>
                      <td className="px-3 py-2.5 num font-bold text-brand-700">{money(s.net)}</td>
                      <td className="px-3 py-2.5">
                        {s.status === 'settled'
                          ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/25"><Check className="w-3 h-3" /> معتمدة</Badge>
                          : <Badge className="bg-amber-50 text-amber-800 ring-amber-600/25"><Clock className="w-3 h-3" /> بانتظار الاعتماد</Badge>}
                      </td>
                      {canSettle && (
                        <td className="px-3 py-2.5 text-end">
                          {s.status === 'pending' && (
                            <Btn sm v="success" icon={<Check className="w-3.5 h-3.5" />} onClick={() => setToSettle(s)}>اعتماد</Btn>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {settleFor && <SettlementModal courier={settleFor} me={me} onClose={() => setSettleFor(null)} />}

      <Confirm
        open={!!toSettle}
        onClose={() => setToSettle(null)}
        onYes={() => toSettle && settleSettlement(me, toSettle.id)}
        title="اعتماد التسوية"
        msg={<>اعتماد تسوية <b>{db.users.find((u) => u.id === toSettle?.courierId)?.name}</b> بصافي <b className="num">{money(toSettle?.net ?? 0)}</b>؟ بعد الاعتماد تُقفل طلباتها ماليًا.</>}
        yes="اعتماد التسوية"
      />
    </div>
  );
}

function SettlementModal({ courier, me, onClose }: { courier: User; me: User; onClose: () => void }) {
  const db = useDB();
  const col = courierCollected(db, courier.id);
  const [fees, setFees] = useState(String(Math.round(col.amount * 0.05)));
  const [adjs, setAdjs] = useState<{ label: string; amount: string }[]>([]);

  const feesN = Number(fees) || 0;
  const adjN = adjs.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const net = col.amount - feesN + adjN;

  const submit = () => {
    createSettlement(me, courier.id, feesN, adjs.filter((a) => a.label.trim() && Number(a.amount)).map((a) => ({ label: a.label.trim(), amount: Number(a.amount) })));
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`تسوية مالية — ${courier.name}`} w="max-w-lg"
      icon={<Banknote className="w-5 h-5" />} desc="احسب صافي مستحقات المندوب بعد الرسوم والتعديلات"
      footer={
        <div className="flex justify-end gap-2">
          <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn icon={<FileText className="w-4 h-4" />} onClick={submit} disabled={col.orders.length === 0}>إنشاء التسوية</Btn>
        </div>
      }>
      <div className="bg-ink rounded-lg p-3.5 mb-4 text-white">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">طلبات مشمولة</span>
          <b className="num text-brand-300">{col.orders.length}</b>
        </div>
        {col.orders.slice(0, 4).map((o) => (
          <div key={o.id} className="flex justify-between text-xs text-slate-400 py-0.5">
            <span className="num" dir="ltr">{o.code}</span>
            <span className="num">{money(o.cod)}</span>
          </div>
        ))}
        {col.orders.length > 4 && <div className="text-[10px] text-slate-500 pt-0.5">+ {col.orders.length - 4} طلبات أخرى</div>}
        <div className="flex justify-between text-sm font-bold border-t border-white/10 mt-2 pt-2">
          <span>إجمالي المحصَّل</span>
          <span className="num text-brand-300">{money(col.amount)}</span>
        </div>
      </div>

      <div className="space-y-3.5">
        <Field label="رسوم الخدمة (خصم)" hint="تُخصم من إجمالي المحصَّل">
          <Input dir="ltr" type="number" min={0} className="num text-left" value={fees} onChange={(e) => setFees(e.target.value)} />
        </Field>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">تعديلات (بدلات / جزاءات)</span>
            <Btn sm v="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdjs([...adjs, { label: '', amount: '' }])}>إضافة سطر</Btn>
          </div>
          <div className="space-y-1.5">
            {adjs.map((a, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="البيان (بدل وقود…)" value={a.label} onChange={(e) => setAdjs(adjs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input dir="ltr" type="number" placeholder="±" className="num text-left w-28" value={a.amount} onChange={(e) => setAdjs(adjs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <button onClick={() => setAdjs(adjs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 p-1" aria-label="حذف السطر">
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
            {adjs.length === 0 && <p className="text-[11px] text-slate-400">لا تعديلات — الصافي = المحصَّل − الرسوم.</p>}
          </div>
        </div>

        <div className="bg-ink text-white rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">الصافي المستحق للمندوب</div>
            <div className="text-[11px] text-slate-500 num" dir="ltr">{col.amount} − {feesN} + {adjN}</div>
          </div>
          <div className="num font-display text-2xl font-bold text-brand-300">{money(net)}</div>
        </div>
      </div>
    </Modal>
  );
}
