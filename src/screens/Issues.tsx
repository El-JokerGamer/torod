import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Send, Flag, RefreshCw, Banknote, Lock, MessageSquare } from 'lucide-react';
import { useDB, useMe, addIssue, chatOnIssue, updateIssue, issueReturnAction } from '../lib/store';
import { ISSUE_TYPES, ISSUE_STATUSES, PRIORITIES, timeAgo, money, zoneById } from '../lib/data';
import type { Issue, IssueStatus, IssueType, Priority, User } from '../lib/data';
import { Btn, Card, Modal, Drawer, Field, Input, Select, Textarea, Empty, PriorityBadge, Badge, CodeChip, StatusBadge } from '../ui/kit';

const TYPE_KEYS = Object.keys(ISSUE_TYPES) as IssueType[];
const STATUS_KEYS = Object.keys(ISSUE_STATUSES) as IssueStatus[];
const PRIORITY_KEYS = Object.keys(PRIORITIES) as Priority[];

export default function Issues() {
  const db = useDB();
  const me = useMe()!;
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState<IssueStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = db.issues
    .filter((i) => (statusF === 'all' ? true : i.status === statusF))
    .filter((i) => {
      const needle = q.trim().toLowerCase();
      return !needle || i.title.toLowerCase().includes(needle) || i.by.toLowerCase().includes(needle);
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const open = openId ? db.issues.find((i) => i.id === openId) ?? null : null;
  const isMgr = ['owner', 'ops'].includes(me.role);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
          <Input placeholder="ابحث بعنوان البلاغ أو مُسجِّله…" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-xs text-slate-500 font-semibold ms-auto"><span className="num">{filtered.length}</span> بلاغ</span>
        <Btn icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>بلاغ جديد</Btn>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={statusF === 'all'} onClick={() => setStatusF('all')} count={db.issues.length}>الكل</Chip>
        {STATUS_KEYS.map((s) => (
          <Chip key={s} active={statusF === s} onClick={() => setStatusF(statusF === s ? 'all' : s)} count={db.issues.filter((i) => i.status === s).length}>
            {ISSUE_STATUSES[s].label}
          </Chip>
        ))}
      </div>

      <Card pad={false}>
        {filtered.length === 0 ? (
          <Empty icon={<Flag className="w-8 h-8" strokeWidth={1.4} />} title="لا بلاغات مطابقة" sub="سجّل أول بلاغ لمتابعته مع الفريق"
            action={<Btn v="soft" sm onClick={() => setShowNew(true)}>بلاغ جديد</Btn>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((i, idx) => {
              const order = i.orderId ? db.orders.find((o) => o.id === i.orderId) : undefined;
              const courier = i.courierId ? db.users.find((u) => u.id === i.courierId) : undefined;
              const last = i.updates[i.updates.length - 1];
              return (
                <button key={i.id} onClick={() => setOpenId(i.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50/50 transition-colors text-start animate-fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${i.priority === 'critical' ? 'bg-red-50 text-red-600' : i.priority === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Flag className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 truncate">{i.title}</span>
                      <PriorityBadge p={i.priority} />
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                      {ISSUE_TYPES[i.type]} · {i.by}
                      {order && <> · <span className="num" dir="ltr">{order.code}</span></>}
                      {courier && <> · {courier.name}</>}
                    </span>
                    {last && <span className="block text-[10px] text-slate-400 truncate mt-0.5">{last.by}: {last.note}</span>}
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={ISSUE_STATUSES[i.status].chip}>{ISSUE_STATUSES[i.status].label}</Badge>
                    <span className="text-[10px] text-slate-400">{timeAgo(i.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {open && <IssueDrawer issue={open} me={me} onClose={() => setOpenId(null)} />}
      {showNew && <NewIssueModal me={me} onClose={() => setShowNew(false)} />}
      <span className="hidden">{isMgr ? null : null}</span>
    </div>
  );
}

const Chip = ({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) => (
  <button onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ring-1 ${active ? 'bg-ink text-white ring-ink shadow-sm' : 'bg-white text-slate-600 ring-slate-300/70 hover:ring-slate-400 hover:bg-slate-50'}`}>
    {children}
    {count !== undefined && <span className={`num text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>}
  </button>
);

// ── درج البلاغ مع المحادثة ──
function IssueDrawer({ issue, me, onClose }: { issue: Issue; me: User; onClose: () => void }) {
  const db = useDB();
  const [note, setNote] = useState('');
  const order = issue.orderId ? db.orders.find((o) => o.id === issue.orderId) : undefined;
  const courier = issue.courierId ? db.users.find((u) => u.id === issue.courierId) : undefined;
  const isMgr = ['owner', 'ops'].includes(me.role);
  const locked = issue.status === 'closed';

  const send = () => {
    if (!note.trim()) return;
    chatOnIssue(me, issue.id, note);
    setNote('');
  };

  return (
    <Drawer open onClose={onClose}>
      <header className="bg-ink text-white px-5 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg font-bold truncate">{issue.title}</h2>
            <PriorityBadge p={issue.priority} />
            <Badge className={ISSUE_STATUSES[issue.status].chip}>{ISSUE_STATUSES[issue.status].label}</Badge>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {ISSUE_TYPES[issue.type]} · سجّله {issue.by} · {timeAgo(issue.createdAt)}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-colors" aria-label="إغلاق">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <div className="space-y-4 min-w-0">
            {order && (
              <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5">
                <div className="text-[11px] font-bold text-slate-500 mb-2">الطلب المرتبط</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CodeChip code={order.code} />
                  <StatusBadge s={order.status} />
                  {order.cod > 0 && <span className="num text-xs font-bold text-brand-700">{money(order.cod)}</span>}
                </div>
                <div className="text-sm font-bold text-slate-800 mt-2">{order.customer}</div>
                <div className="text-[11px] text-slate-500">{order.address} — {zoneById(order.zoneId)?.name}</div>

                {/* قرارات الإدارة للمرتجعات */}
                {isMgr && order.status === 'failed' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-red-700 mb-2">الطلب فشل تسليمه — قرار الإدارة:</div>
                    <div className="flex gap-2">
                      <Btn sm v="dark" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => issueReturnAction(me, issue.id, 'redeliver')}>تحويل لمرتجع وإعادة التوصيل</Btn>
                    </div>
                  </div>
                )}
                {isMgr && order.status === 'returned' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-rose-700 mb-2">الطلب مرتجع — قرار الإدارة:</div>
                    <div className="flex gap-2 flex-wrap">
                      <Btn sm v="dark" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => issueReturnAction(me, issue.id, 'redeliver')}>إعادة التوصيل للمندوب</Btn>
                      <Btn sm v="success" icon={<Banknote className="w-3.5 h-3.5" />} onClick={() => issueReturnAction(me, issue.id, 'refund')}>رد المبلغ وإغلاق البلاغ</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}
            {courier && (
              <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">{courier.name[0]}</span>
                <div>
                  <div className="text-[11px] font-bold text-slate-500">المندوب المرتبط</div>
                  <div className="text-sm font-bold text-slate-800">{courier.name}</div>
                  <div className="text-[10px] text-slate-400">{courier.online ? 'متصل الآن' : 'غير متصل'}</div>
                </div>
              </div>
            )}

            {/* تغيير الحالة */}
            {isMgr && (
              <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-3.5">
                <div className="text-[11px] font-bold text-slate-500 mb-2">تغيير حالة البلاغ</div>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_KEYS.filter((s) => s !== issue.status).map((s) => (
                    <button key={s} onClick={() => updateIssue(me, issue.id, '', s)}
                      className={`text-[11px] font-bold rounded-full px-3 py-1 ring-1 transition-all hover:scale-105 ${ISSUE_STATUSES[s].chip}`}>
                      → {ISSUE_STATUSES[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 min-w-0 md:flex md:flex-col">
            <div className="bg-white rounded-lg ring-1 ring-slate-900/8 p-4 md:flex md:flex-col md:flex-1 md:min-h-0">
              <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                محادثة البلاغ — تواصل مباشر مع المندوب ({issue.updates.length})
              </div>
              <ChatThread issue={issue} />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white p-4 pb-safe">
        {locked ? (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 py-1.5">
            <Lock className="w-4 h-4" /> البلاغ مغلق — المحادثة للقراءة فقط
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب متابعة أو ردًّا…" onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <Btn icon={<Send className="w-4 h-4" />} disabled={!note.trim()} onClick={send}>إرسال</Btn>
          </div>
        )}
      </footer>
    </Drawer>
  );
}

function ChatThread({ issue }: { issue: Issue }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [issue.updates.length]);

  if (issue.updates.length === 0) return <p className="text-xs text-slate-400 py-3">لا رسائل بعد — ابدأ المحادثة من الأسفل.</p>;

  return (
    <div className="mt-3 space-y-2.5 max-h-80 md:max-h-none md:flex-1 overflow-y-auto pe-1">
      {issue.updates.map((u, i) => {
        const fromCourier = u.byRole === 'courier';
        if (u.status && !u.note) {
          return (
            <div key={i} className="flex justify-center">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-3 py-1">
                تحوّلت الحالة إلى «{ISSUE_STATUSES[u.status].label}» · {u.by}
              </span>
            </div>
          );
        }
        return (
          <div key={i} className={`flex ${fromCourier ? 'justify-start' : 'justify-end'} animate-fade-up`}>
            <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 ${fromCourier ? 'bg-sky-50 ring-1 ring-sky-200 rounded-bl-sm' : 'bg-brand-600 text-white rounded-br-sm shadow-sm shadow-brand-600/25'}`}>
              <div className={`text-[10px] font-bold mb-0.5 ${fromCourier ? 'text-sky-700' : 'text-brand-100'}`}>
                {u.by} · {fromCourier ? 'المندوب' : 'الإدارة'}
              </div>
              <div className={`text-[13px] leading-6 whitespace-pre-wrap ${fromCourier ? 'text-slate-700' : 'text-white'}`}>{u.note}</div>
              <div className={`text-[9px] mt-1 num ${fromCourier ? 'text-slate-400' : 'text-brand-200'}`} dir="ltr">{timeAgo(u.at)}</div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── بلاغ جديد ──
function NewIssueModal({ me, onClose }: { me: User; onClose: () => void }) {
  const db = useDB();
  const couriers = db.users.filter((u) => u.role === 'courier');
  const [f, setF] = useState({ title: '', type: 'delay' as IssueType, priority: 'medium' as Priority, orderId: '', courierId: '', note: '' });
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 4) return setErr('أدخل عنوانًا واضحًا للبلاغ');
    addIssue(me, { title: f.title.trim(), type: f.type, priority: f.priority, orderId: f.orderId || undefined, courierId: f.courierId || undefined, note: f.note.trim() });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="بلاغ جديد" w="max-w-lg"
      icon={<Flag className="w-5 h-5" />} desc="سجّل مشكلة أو حادثة لمتابعتها مع الفريق"
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" form="issue-form" icon={<Flag className="w-4 h-4" />}>تسجيل البلاغ</Btn>
        </div>
      }>
      <form id="issue-form" onSubmit={submit} className="space-y-3.5">
        <Field label="عنوان البلاغ" req error={err}>
          <Input value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(''); }} placeholder="مثال: تأخير شحنة منطقة بنها" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="النوع">
            <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as IssueType })}>
              {TYPE_KEYS.map((t) => <option key={t} value={t}>{ISSUE_TYPES[t]}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
              {PRIORITY_KEYS.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="طلب مرتبط (اختياري)">
            <Select value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value })}>
              <option value="">بدون</option>
              {db.orders.slice(0, 40).map((o) => <option key={o.id} value={o.id}>{o.code} — {o.customer}</option>)}
            </Select>
          </Field>
          <Field label="مندوب مرتبط (اختياري)">
            <Select value={f.courierId} onChange={(e) => setF({ ...f, courierId: e.target.value })}>
              <option value="">بدون</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="التفاصيل">
          <Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="وصف الموقف…" />
        </Field>
      </form>
    </Modal>
  );
}
