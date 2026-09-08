import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, Bike, Check, AlertTriangle, Banknote, ArrowLeft } from 'lucide-react';
import { useDB, useMe } from '../lib/store';
import { STATUS_META, money, timeAgo, zoneById } from '../lib/data';
import type { Order, OrderStatus, User } from '../lib/data';
import { Stat, Card, StatusBadge, CodeChip, Avatar, LiveDot, Empty } from '../ui/kit';
import { LiveMap } from '../ui/map';

export function scopedOrders(orders: Order[], me: User): Order[] {
  if (me.role === 'hub') return orders.filter((o) => me.hubIds.includes(o.hubId));
  return orders;
}

export default function Dashboard({ goOrders }: { goOrders?: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const orders = scopedOrders(db.orders, me);
  const couriers = db.users.filter((u) => u.role === 'courier');

  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const inMotion = count('on_way') + count('handed') + count('arrived');
  const delivered = count('delivered');
  const failed = count('failed') + count('returned');
  const codCollected = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.cod, 0);
  const codPending = orders.filter((o) => ['handed', 'on_way', 'arrived', 'assigned'].includes(o.status)).reduce((s, o) => s + o.cod, 0);

  const mapOrders = orders.filter((o) => !['delivered', 'failed', 'returned'].includes(o.status));
  const pieData = (Object.keys(STATUS_META) as OrderStatus[])
    .map((s) => ({ name: STATUS_META[s].label, value: count(s), hex: STATUS_META[s].hex }))
    .filter((d) => d.value > 0);

  const recent = [...orders].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);

  return (
    <div className="space-y-4">
      {me.role === 'hub' && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-md px-3 py-2 w-fit">
          نطاق العرض: مخازنك المرتبطة فقط ({me.hubIds.length})
        </div>
      )}

      {/* المؤشرات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Stat label="إجمالي الطلبات" value={orders.length} sub={`${count('created')} جديد بانتظار الإسناد`} icon={<Package className="w-5 h-5" />} tone="ink" />
        <Stat label="قيد التوصيل" value={inMotion} sub={`${count('assigned')} مُسند للمندوبين`} icon={<Bike className="w-5 h-5" />} tone="blue" />
        <Stat label="تم التسليم" value={delivered} sub={`${Math.round((delivered / Math.max(1, orders.length)) * 100)}% من الإجمالي`} icon={<Check className="w-5 h-5" />} tone="green" />
        <Stat label="فشل التسليم" value={failed} sub={`${count('failed')} بانتظار إجراء`} icon={<AlertTriangle className="w-5 h-5" />} tone="red" />
        <Stat label="تحصيل COD" value={money(codCollected)} sub={`معلّق: ${money(codPending)}`} icon={<Banknote className="w-5 h-5" />} tone="brand" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* الخريطة المباشرة */}
        <Card title="خريطة التشغيل المباشرة" sub="مواقع المندوبين والطلبات النشطة لحظيًا" className="lg:col-span-2" pad={false}>
          <div className="p-3">
            <LiveMap db={db} orders={mapOrders} couriers={couriers} className="h-64 sm:h-72 2xl:h-80" />
          </div>
        </Card>

        {/* توزيع الحالات */}
        <Card title="توزيع حالات الطلبات" sub="حسب مراحل خط التشغيل" pad={false}>
          <div className="p-2 flex flex-col items-center">
            <div dir="ltr" className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2.5} strokeWidth={0}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.hex} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} طلب`, n]}
                    contentStyle={{ direction: 'rtl', fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1 px-3 pb-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: d.hex }} />
                  <span className="truncate">{d.name}</span>
                  <span className="num font-bold text-slate-800 ms-auto">{d.value}</span>
                </div>
              ))}
              {pieData.length === 0 && <span className="col-span-2 text-[11px] text-slate-400 text-center py-2">لا طلبات بعد</span>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* آخر الطلبات */}
        <Card
          title="آخر الطلبات تحديثًا"
          sub="أحدث الحركات على خط التشغيل"
          className="lg:col-span-2"
          pad={false}
          actions={goOrders && <button onClick={goOrders} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">كل الطلبات <ArrowLeft className="w-3.5 h-3.5" /></button>}
        >
          {recent.length === 0 ? (
            <Empty icon={<Package className="w-8 h-8" strokeWidth={1.4} />} title="لا توجد طلبات بعد" sub="أنشئ أول طلب شحن من شاشة الطلبات وسيظهر هنا مع كل تحديث" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((o, i) => (
                <button
                  key={o.id}
                  onClick={goOrders}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50/50 transition-colors text-start animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <CodeChip code={o.code} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800 truncate">{o.customer}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{zoneById(o.zoneId)?.name} — {o.address}</span>
                  </span>
                  {o.cod > 0 && <span className="num text-[11px] font-bold text-brand-700 bg-brand-50 ring-1 ring-brand-200 rounded-full px-2 py-0.5 shrink-0">{money(o.cod)}</span>}
                  <StatusBadge s={o.status} />
                  <span className="text-[10px] text-slate-400 shrink-0 w-14 text-end">{timeAgo(o.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* المندوبون */}
        <Card title="المندوبون الآن" sub="الإشارة اللحظية من الميدان" pad={false}>
          {couriers.length === 0 ? (
            <Empty icon={<Bike className="w-8 h-8" strokeWidth={1.4} />} title="لا يوجد مندوبون" sub="أضف مندوبين من شاشة إدارة الفريق ليظهروا على الخريطة" />
          ) : (
            <div className="divide-y divide-slate-100">
              {couriers.map((c) => {
                const p = db.positions[c.id];
                const active = db.orders.filter((o) => o.courierId === c.id && ['handed', 'on_way', 'arrived'].includes(o.status)).length;
                const route = db.routes.find((r) => r.courierIds.includes(c.id));
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span className="relative">
                      <Avatar id={c.id} name={c.name} />
                      <span className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${c.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800 truncate">{c.name}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{route?.name ?? 'بدون مسار'}</span>
                    </span>
                    {c.online ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <LiveDot /> {active} نشط · {p ? timeAgo(p.lastAt) : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">غير متصل</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
