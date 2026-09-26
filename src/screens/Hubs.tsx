import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, MapPin, Warehouse, Check } from 'lucide-react';
import { useDB, useMe, saveHub, deleteHub, saveUser } from '../lib/store';
import { ZONES } from '../lib/data';
import type { Hub, User } from '../lib/data';
import { Btn, Modal, Confirm, Field, Input, Select, Empty, Avatar, Badge } from '../ui/kit';

export default function Hubs() {
  const db = useDB();
  const me = useMe()!;
  const [editing, setEditing] = useState<Hub | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<Hub | null>(null);
  const [linkFor, setLinkFor] = useState<Hub | null>(null);
  const canEdit = ['owner', 'ops'].includes(me.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">مخازن الفرز بمناطقها — اربط بها أمناء الفرز ليعملوا على طلباتها فقط.</p>
        {canEdit && <Btn className="ms-auto" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>مخزن جديد</Btn>}
      </div>

      {db.hubs.length === 0 ? (
        <div className="bg-white rounded-lg ring-1 ring-slate-900/8">
          <Empty icon={<Warehouse className="w-8 h-8" strokeWidth={1.4} />} title="لا توجد مخازن بعد" sub="أنشئ أول مخزن فرز وابدأ ربط أمناء الفرز به"
            action={canEdit ? <Btn v="soft" onClick={() => setShowNew(true)}>إنشاء مخزن</Btn> : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {db.hubs.map((h, i) => {
            const zone = ZONES.find((z) => z.id === h.zoneId);
            const staff = db.users.filter((u) => u.hubIds.includes(h.id));
            const openOrders = db.orders.filter((o) => o.hubId === h.id && !['delivered', 'failed', 'returned'].includes(o.status)).length;
            return (
              <article key={h.id} className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200 flex items-center justify-center shrink-0">
                    <Warehouse className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-ink leading-tight truncate">{h.name}</h3>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-500" />
                      {zone?.name ?? '—'} <span className="text-slate-300">·</span> {h.address || 'بدون عنوان'}
                    </div>
                    {h.phone && <div className="num text-[11px] text-slate-400 mt-0.5" dir="ltr">{h.phone}</div>}
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-300 shrink-0"><span className="num">{openOrders}</span> نشط</Badge>
                </div>

                <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">الفريق:</span>
                  {staff.length ? (
                    <span className="flex -space-x-1.5" dir="ltr">
                      {staff.map((u) => <Avatar key={u.id} id={u.id} name={u.name} size="w-6 h-6 text-[8px]" />)}
                    </span>
                  ) : <span className="text-[10px] text-slate-400">لا موظفين</span>}
                  {canEdit && (
                    <span className="ms-auto flex gap-1">
                      <button onClick={() => setLinkFor(h)} className="p-1.5 rounded-md text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors" title="ربط الموظفين">
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditing(h)} className="p-1.5 rounded-md text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors" title="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setToDelete(h)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(showNew || editing) && <HubModal hub={editing} onClose={() => { setShowNew(false); setEditing(null); }} me={me} />}
      {linkFor && <LinkStaffModal hub={linkFor} me={me} onClose={() => setLinkFor(null)} />}
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onYes={() => toDelete && deleteHub(me, toDelete.id)}
        title="حذف مخزن"
        msg={<>سيُحذف مخزن <b>{toDelete?.name}</b> ويُفك ربط الموظفين به. الطلبات التاريخية تبقى كما هي.</>}
      />
    </div>
  );
}

function HubModal({ hub, me, onClose }: { hub: Hub | null; me: User; onClose: () => void }) {
  const [f, setF] = useState({
    name: hub?.name ?? '', zoneId: hub?.zoneId ?? ZONES[8].id,
    address: hub?.address ?? '', phone: hub?.phone ?? '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'أدخل اسم المخزن';
    setErrs(er);
    if (Object.keys(er).length) return;
    saveHub(me, { name: f.name.trim(), zoneId: f.zoneId, address: f.address.trim(), phone: f.phone.trim() }, hub?.id);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={hub ? `تعديل ${hub.name}` : 'مخزن جديد'} w="max-w-lg"
      icon={<Warehouse className="w-5 h-5" />} desc={hub ? 'حدّث بيانات مخزن الفرز' : 'أنشئ مخزن فرز جديد في منطقة تغطية'}
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" form="hub-form" icon={<Check className="w-4 h-4" />}>{hub ? 'حفظ التعديلات' : 'إضافة المخزن'}</Btn>
        </div>
      }>
      <form id="hub-form" onSubmit={submit} className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="اسم المخزن" req error={errs.name}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مخزن شبرا الرئيسي" />
          </Field>
          <Field label="المنطقة">
            <Select value={f.zoneId} onChange={(e) => setF({ ...f, zoneId: e.target.value })}>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="العنوان">
          <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="شارع الجمهورية، بجوار…" />
        </Field>
        <Field label="الهاتف">
          <Input dir="ltr" className="num text-left" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" />
        </Field>
      </form>
    </Modal>
  );
}

function LinkStaffModal({ hub, me, onClose }: { hub: Hub; me: User; onClose: () => void }) {
  const db = useDB();
  const eligible = db.users.filter((u) => ['hub', 'ops'].includes(u.role));

  const toggle = (u: User) => {
    const linked = u.hubIds.includes(hub.id);
    saveUser(me, {
      name: u.name, username: u.username, password: u.password, role: u.role, phone: u.phone, active: u.active,
      hubIds: linked ? u.hubIds.filter((x) => x !== hub.id) : [...u.hubIds, hub.id],
    }, u.id);
  };

  return (
    <Modal open onClose={onClose} title={`فريق ${hub.name}`} w="max-w-md"
      icon={<Users className="w-5 h-5" />} desc="أمين الفرز يرى ويعمل فقط على طلبات مخازنه المرتبطة">
      {eligible.length === 0 ? (
        <Empty icon={<Users className="w-8 h-8" strokeWidth={1.4} />} title="لا أمناء فرز بعد" sub="أضف موظفين بدور «أمين فرز» من إدارة الفريق" />
      ) : (
        <div className="space-y-1.5">
          {eligible.map((u) => {
            const on = u.hubIds.includes(hub.id);
            return (
              <button key={u.id} onClick={() => toggle(u)}
                className={`w-full flex items-center gap-2.5 rounded-md ring-1 px-3 py-2 text-start transition-all ${on ? 'ring-brand-500 bg-brand-50' : 'ring-slate-200 bg-white hover:ring-slate-300'}`}>
                <Avatar id={u.id} name={u.name} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-700 truncate">{u.name}</span>
                  <span className="block text-[10px] text-slate-400">{u.role === 'hub' ? 'أمين فرز' : 'مشرف عمليات'}</span>
                </span>
                {on && <Badge className="bg-brand-600 text-white ring-brand-600">مرتبط</Badge>}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
