import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, Lock, Check, Users, Warehouse, ShieldCheck, KeyRound } from 'lucide-react';
import { useDB, useMe, saveUser, deleteUser, toggleUserActive } from '../lib/store';
import { ROLE_LABELS, fmtDate, timeAgo, BASE_OWNER_ID } from '../lib/data';
import type { Role, User } from '../lib/data';
import { Btn, Card, Modal, Confirm, Field, Input, Select, Avatar, Badge, Chip, Empty, FormSection } from '../ui/kit';

const ROLE_CHIP: Record<Role, string> = {
  owner: 'bg-ink text-white ring-ink',
  hr: 'bg-petrol-100 text-petrol-700 ring-petrol-500/30',
  ops: 'bg-blue-50 text-blue-700 ring-blue-600/25',
  hub: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  finance: 'bg-emerald-50 text-emerald-700 ring-emerald-600/25',
  courier: 'bg-brand-50 text-brand-700 ring-brand-600/25',
};

export default function Team() {
  const db = useDB();
  const me = useMe()!;
  const [roleF, setRoleF] = useState<Role | 'all'>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [toToggle, setToToggle] = useState<User | null>(null);

  const needle = q.trim().toLowerCase();
  const filtered = db.users
    .filter((u) => (roleF === 'all' ? true : u.role === roleF))
    .filter((u) => !needle || u.name.toLowerCase().includes(needle) || u.username.toLowerCase().includes(needle));
  const canToggle = ['owner', 'ops', 'hr'].includes(me.role);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
          <Input placeholder="ابحث بالاسم أو اسم المستخدم…" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Btn className="ms-auto" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>مستخدم جديد</Btn>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={roleF === 'all'} onClick={() => setRoleF('all')} count={db.users.length}>الكل</Chip>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <Chip key={r} active={roleF === r} onClick={() => setRoleF(roleF === r ? 'all' : r)} count={db.users.filter((u) => u.role === r).length}>
            {ROLE_LABELS[r]}
          </Chip>
        ))}
      </div>

      <Card pad={false}>
        {filtered.length === 0 ? (
          <Empty icon={<Users className="w-8 h-8" strokeWidth={1.4} />} title="لا مستخدمون مطابقون" sub="جرّب تعديل البحث أو الفلاتر" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100">
                  <th className="text-start font-bold px-4 py-2.5">المستخدم</th>
                  <th className="text-start font-bold px-3 py-2.5">الدور</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden md:table-cell">الربط</th>
                  <th className="text-start font-bold px-3 py-2.5 hidden lg:table-cell">أضيف في</th>
                  <th className="text-start font-bold px-3 py-2.5">الحالة</th>
                  <th className="px-3 py-2.5 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u, i) => {
                  const hubs = db.hubs.filter((h) => u.hubIds.includes(h.id));
                  const routes = db.routes.filter((r) => r.courierIds.includes(u.id));
                  const locked = u.role === 'owner' && me.id !== u.id;
                  return (
                    <tr key={u.id} className="hover:bg-brand-50/40 transition-colors animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar id={u.id} name={u.name} />
                          <span>
                            <span className="flex items-center gap-1.5 font-bold text-slate-800">
                              {u.name}
                              {u.id === me.id && <span className="text-[10px] text-brand-600 font-semibold">(أنت)</span>}
                              {u.id === BASE_OWNER_ID && u.id !== me.id && (
                                <span title="حساب محمي — لا يعدّله إلا المالك الأساسي" className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 ring-1 ring-slate-200 rounded-full px-1.5 py-0.5">
                                  <Lock className="w-3 h-3" /> محمي
                                </span>
                              )}
                            </span>
                            <span className="num block text-[11px] text-slate-400" dir="ltr">@{u.username}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><Badge className={ROLE_CHIP[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {u.role === 'hub' && (hubs.length ? hubs.map((h) => h.name).join('، ') : <span className="text-slate-300 text-xs">غير مربوط بمخزن</span>)}
                        {u.role === 'courier' && (routes.length ? routes.map((r) => r.name).join('، ') : <span className="text-slate-300 text-xs">بدون مسار</span>)}
                        {!['hub', 'courier'].includes(u.role) && <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-slate-500" title={timeAgo(u.createdAt)}>{fmtDate(u.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        {u.active === false ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> معطّل
                          </span>
                        ) : u.role === 'courier' ? (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${u.online ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            {u.online ? 'متصل بالميدان' : 'غير متصل'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> فعّال
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex justify-end gap-1">
                          {canToggle && u.role !== 'owner' && u.id !== me.id && (
                            <button
                              onClick={() => setToToggle(u)}
                              className={`p-1.5 rounded-md transition-colors ${u.active === false ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                              title={u.active === false ? 'تفعيل الحساب' : 'تعطيل الحساب'}
                            >
                              {u.active === false ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => setEditing(u)}
                            disabled={locked}
                            className="p-1.5 rounded-md text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title={locked ? 'حساب المالك محمي — لا يعدّله إلا صاحبه' : 'تعديل'}
                          >
                            {locked ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setToDelete(u)}
                            disabled={u.id === me.id || u.role === 'owner'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title={u.role === 'owner' ? 'حسابات الملاك محمية من الحذف' : u.id === me.id ? 'لا يمكنك حذف نفسك' : 'حذف'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(showNew || editing) && <UserModal user={editing} me={me} onClose={() => { setShowNew(false); setEditing(null); }} />}

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onYes={() => toDelete && deleteUser(me, toDelete.id)}
        title="حذف مستخدم من النظام"
        msg={<>سيُحذف <b>{toDelete?.name}</b> (@<span className="num" dir="ltr">{toDelete?.username}</span>) من نظام الفريق بالكامل — يفقد الدخول فورًا ويختفي من المسارات وقوائم الربط.</>}
      />

      <Confirm
        open={!!toToggle}
        onClose={() => setToToggle(null)}
        onYes={() => toToggle && toggleUserActive(me, toToggle.id)}
        title={toToggle?.active === false ? 'تفعيل الحساب' : 'تعطيل الحساب'}
        msg={toToggle?.active === false
          ? <>سيتمكن <b>{toToggle?.name}</b> من تسجيل الدخول مجددًا.</>
          : <>لن يتمكن <b>{toToggle?.name}</b> من تسجيل الدخول حتى إعادة تفعيله.</>}
        yes={toToggle?.active === false ? 'تفعيل' : 'تعطيل'}
      />
    </div>
  );
}

function UserModal({ user, me, onClose }: { user: User | null; me: User; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    password: user?.password ?? '1234',
    role: (user?.role ?? 'hub') as Role,
    phone: user?.phone ?? '',
    hubIds: user?.hubIds ?? [] as string[],
  });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const isOwnerTarget = user?.role === 'owner';
  const lockRole = isOwnerTarget || (user?.role === 'hr' && me.role !== 'owner');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'الاسم كاملًا (3 أحرف على الأقل)';
    if (!/^[a-z0-9_]{3,16}$/i.test(f.username.trim())) er.username = '3-16 حرفًا لاتينيًا أو رقمًا';
    if (f.password.length < 4) er.password = 'كلمة مرور 4 أحرف على الأقل';
    if (f.role === 'hub' && f.hubIds.length === 0) er.hubIds = 'اربط أمين الفرز بمخزن واحد على الأقل';
    setErrs(er);
    if (Object.keys(er).length) return;
    saveUser(me, {
      name: f.name.trim(), username: f.username.trim(), password: f.password,
      role: f.role, phone: f.phone.trim(), hubIds: f.hubIds, active: user?.active,
    }, user?.id);
    onClose();
  };

  const toggleHub = (id: string) =>
    setF((p) => ({ ...p, hubIds: p.hubIds.includes(id) ? p.hubIds.filter((x) => x !== id) : [...p.hubIds, id] }));

  return (
    <Modal open onClose={onClose} title={user ? `تعديل ${user.name}` : 'مستخدم جديد'} w="max-w-lg"
      icon={<ShieldCheck className="w-5 h-5" />} desc={user ? 'حدّث بيانات الحساب وصلاحياته' : 'أضف عضوًا جديدًا لنظام الفريق'}
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" form="user-form" icon={<Check className="w-4 h-4" />}>{user ? 'حفظ التعديلات' : 'إضافة المستخدم'}</Btn>
        </div>
      }>
      <form id="user-form" onSubmit={submit} className="space-y-3.5">
        <FormSection label="بيانات الحساب" icon={<KeyRound className="w-3.5 h-3.5" />} />
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="الاسم الكامل" req error={errs.name}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثال: كريم فوزي" />
          </Field>
          <Field label="اسم المستخدم (للدخول)" req error={errs.username}>
            <Input dir="ltr" className="num text-left" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="k.fawzy" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="كلمة المرور" req error={errs.password}>
            <Input dir="ltr" className="num text-left" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
          <Field label="الهاتف">
            <Input dir="ltr" className="num text-left" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" />
          </Field>
        </div>

        <FormSection label="الدور والصلاحيات" icon={<ShieldCheck className="w-3.5 h-3.5" />} />
        <Field
          label="الدور الوظيفي"
          hint={lockRole
            ? (isOwnerTarget ? 'حساب المالك محمي من تغيير الدور' : 'دور الموارد البشرية ثابت — لا يغيّره إلا المالك')
            : 'يحدد الشاشات التي يراها بعد الدخول'}
        >
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} disabled={lockRole}>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>

        {f.role === 'hub' && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">المخازن المرتبطة <span className="text-red-500">*</span></div>
            {db.hubs.length === 0 ? (
              <p className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-md px-3 py-2">لا توجد مخازن بعد — أنشئ مخزنًا من شاشة المخازن أولًا.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {db.hubs.map((h) => {
                  const on = f.hubIds.includes(h.id);
                  return (
                    <button type="button" key={h.id} onClick={() => toggleHub(h.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-all ${on ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-300 hover:ring-slate-400'}`}>
                      <Warehouse className="w-3.5 h-3.5" /> {h.name}
                      {on && <Check className="w-3.5 h-3.5" strokeWidth={2.6} />}
                    </button>
                  );
                })}
              </div>
            )}
            {errs.hubIds && <p className="text-[11px] text-red-600 font-semibold mt-1">{errs.hubIds}</p>}
          </div>
        )}
      </form>
    </Modal>
  );
}
