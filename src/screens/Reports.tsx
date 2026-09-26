import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Download, BarChart3, Search } from 'lucide-react';
import { useDB, useMe } from '../lib/store';
import { STATUS_META, FAIL_REASONS, money, downloadCSV } from '../lib/data';
import type { OrderStatus } from '../lib/data';
import { Card, Empty, Btn, Input } from '../ui/kit';

export default function Reports() {
  const db = useDB();
  const me = useMe()!;
  const [q, setQ] = useState('');
  const orders = db.orders;
  const couriers = db.users.filter((u) => u.role === 'courier');

  const statusData = useMemo(() =>
    (Object.keys(STATUS_META) as OrderStatus[])
      .map((s) => ({ name: STATUS_META[s].label, value: orders.filter((o) => o.status === s).length, hex: STATUS_META[s].hex }))
      .filter((d) => d.value > 0),
    [orders]);

  const failData = useMemo(() => {
    const failed = orders.filter((o) => o.status === 'failed');
    return FAIL_REASONS.map((r) => ({ name: r, count: failed.filter((o) => o.failReason === r).length })).filter((d) => d.count > 0);
  }, [orders]);

  const codByCourier = useMemo(() =>
    couriers.map((c) => {
      const delivered = orders.filter((o) => o.courierId === c.id && o.status === 'delivered');
      const pending = orders.filter((o) => o.courierId === c.id && ['handed', 'on_way', 'arrived', 'assigned'].includes(o.status));
      return {
        name: c.name.split(' ')[0],
        محصَّل: delivered.reduce((s, o) => s + o.cod, 0),
        معلّق: pending.reduce((s, o) => s + o.cod, 0),
      };
    }).filter((d) => d.محصَّل > 0 || d.معلّق > 0),
    [couriers, orders]);

  const needle = q.trim().toLowerCase();
  const filteredCouriers = codByCourier.filter((c) => !needle || c.name.toLowerCase().includes(needle));

  const exportReport = () => {
    const header = ['كود الطلب', 'العميل', 'الهاتف', 'المنطقة', 'المخزن', 'COD', 'الحالة', 'المندوب', 'تاريخ الإنشاء'];
    const rows = orders.map((o) => [
      o.code, o.customer, o.phone,
      (db.routes.find((r) => r.zoneId === o.zoneId)?.name ?? o.zoneId).replace('مسار ', ''),
      db.hubs.find((h) => h.id === o.hubId)?.name ?? '',
      o.cod, STATUS_META[o.status].label,
      db.users.find((u) => u.id === o.courierId)?.name ?? '',
      new Date(o.createdAt).toLocaleDateString('ar-EG'),
    ]);
    downloadCSV(`تقرير-طرود-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  };

  if (orders.length === 0 && couriers.length === 0) {
    return (
      <div className="bg-white rounded-lg ring-1 ring-slate-900/8">
        <Empty icon={<BarChart3 className="w-8 h-8" strokeWidth={1.4} />} title="لا بيانات للتقارير بعد" sub="أضف طلبات ومندوبين وستُبنى التقارير تلقائيًا" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">تحليلات لحظية من قاعدة البيانات المشتركة.</p>
        <Btn className="ms-auto" icon={<Download className="w-4 h-4" />} onClick={exportReport}>تصدير التقرير (Excel)</Btn>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="توزيع حالات الطلبات" sub="إجمالي الطلبات حسب المرحلة">
          <div dir="ltr" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2.5} strokeWidth={0}>
                  {statusData.map((d) => <Cell key={d.name} fill={d.hex} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} طلب`, n]} contentStyle={{ direction: 'rtl', fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="أسباب فشل التسليم" sub="توزيع حالات الفشل المسجّلة">
          {failData.length === 0 ? (
            <Empty icon={<BarChart3 className="w-7 h-7" strokeWidth={1.4} />} title="لا حالات فشل" sub="كل الطلبات تسير بنجاح" />
          ) : (
            <div dir="ltr" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontFamily: 'var(--font-body)' }} orientation="right" />
                  <Tooltip contentStyle={{ direction: 'rtl', fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="الحالات" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title="تحصيل COD لكل مندوب" sub="محصَّل مقابل معلّق" pad={false}>
        <div className="px-4 pt-3">
          <div className="relative w-full sm:w-64">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
            <Input placeholder="ابحث عن مندوب…" className="ps-9 py-1.5 text-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {filteredCouriers.length === 0 ? (
          <Empty icon={<BarChart3 className="w-7 h-7" strokeWidth={1.4} />} title="لا بيانات تحصيل" sub="سلّم مندوبوك طلبات COD لتظهر هنا" />
        ) : (
          <div dir="ltr" className="h-72 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredCouriers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ direction: 'rtl', fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 11 }} />
                <Bar dataKey="محصَّل" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="معلّق" fill="#e8501e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
