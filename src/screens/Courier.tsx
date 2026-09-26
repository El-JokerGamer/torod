import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LogOut, Power, MapPin, Phone, Navigation, Check, X, Camera, Send, Plus, Flag,
  ChevronDown, Warehouse, Bike, MessageSquare, Lock,
} from 'lucide-react';
import {
  useDB, useMe, logout, toggleOnline, courierScanReceive, courierOnWay, courierArrived, courierDeliver,
  courierFail, addIssue, chatOnIssue, toast,
} from '../lib/store';
import { STATUS_META, FAIL_REASONS, ISSUE_TYPES, ISSUE_STATUSES, zoneById, money, timeAgo } from '../lib/data';
import type { Issue, IssueType, Order, Priority, User } from '../lib/data';
import { Btn, Modal, Field, Input, Select, Textarea, Badge, CodeChip, Empty, AppIcon, PriorityBadge } from '../ui/kit';
import { LiveMap } from '../ui/map';
import { CameraScanModal, PodCapture } from '../ui/camera';

type Tab = 'tasks' | 'issues' | 'done';

export default function CourierApp() {
  const db = useDB();
  const me = useMe()!;
  const [tab, setTab] = useState<Tab>('tasks');
  const [mapOpen, setMapOpen] = useState(true);
  const [scanFor, setScanFor] = useState<Order | null>(null);
  const [scanReceiveOpen, setScanReceiveOpen] = useState(false);
  const [deliverFor, setDeliverFor] = useState<Order | null>(null);
  const [failFor, setFailFor] = useState<Order | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [chatFor, setChatFor] = useState<string | null>(null);

  const toReceive = useMemo(() => db.orders.filter((o) => o.courierId === me.id && o.status === 'assigned'), [db.orders, me.id]);
  const active = useMemo(() => db.orders.filter((o) => o.courierId === me.id && ['handed', 'on_way', 'arrived'].includes(o.status)).sort((a, b) => b.updatedAt - a.updatedAt), [db.orders, me.id]);
  const doneToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return db.orders.filter((o) => o.courierId === me.id && ['delivered', 'failed'].includes(o.status) && o.updatedAt >= start.getTime()).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.orders, me.id]);
  const myIssues = useMemo(() => db.issues.filter((i) => i.courierId === me.id).sort((a, b) => b.createdAt - a.createdAt), [db.issues, me.id]);
  const openChat = chatFor ? db.issues.find((i) => i.id === chatFor) ?? null : null;

  const collectedToday = doneToday.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.cod, 0);
  const myRoute = db.routes.find((r) => r.courierIds.includes(me.id));

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'tasks', label: 'مهامي', icon: <Bike className="w-4 h-4" />, count: active.length + toReceive.length },
    { key: 'issues', label: 'البلاغات', icon: <MessageSquare className="w-4 h-4" />, count: myIssues.filter((i) => i.status === 'open' || i.status === 'progress').length },
    { key: 'done', label: 'المنجز', icon: <Check className="w-4 h-4" />, count: doneToday.length },
  ];

  return (
    <div className="flex-1 min-h-0 bg-ink text-white flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-full shadow-2xl shadow-black/60 bg-ink-2 relative">
        {/* الترويسة */}
        <header className="relative bg-ink-3 bg-grid-dark px-4 pt-safe">
          <div className="flex items-center gap-3 py-3.5">
            <span className="relative">
              <AppIcon className="w-11 h-11 rounded-xl ring-2 ring-white/10" />
              <span className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-ink-3 ${me.online ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-500'}`} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[17px] leading-tight truncate">{me.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${me.online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {me.online ? `متصل · ${myRoute?.name ?? 'بدون مسار'}` : 'غير متصل'}
              </div>
            </div>
            <Btn sm v={me.online ? 'dark' : 'success'} className={me.online ? 'bg-white/10 ring-1 ring-white/15' : ''} icon={<Power className="w-3.5 h-3.5" />} onClick={() => toggleOnline(me)}>
              {me.online ? 'إيقاف' : 'اتصال'}
            </Btn>
            <button
              onClick={() => logout()}
              title="تسجيل الخروج"
              className="p-2 rounded-md bg-white/5 ring-1 ring-white/10 text-slate-400 hover:text-red-300 hover:bg-red-500/10 hover:ring-red-500/30 transition-all active:scale-90"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {!me.online && (
            <div className="flex items-center gap-2 text-[11px] font-semibold text-red-300 bg-red-500/10 ring-1 ring-red-500/30 rounded-md px-3 py-2 mb-3 animate-fade-up">
              <Flag className="w-4 h-4 shrink-0" />
              أنت غير متصل — اضغط «اتصال» لاستلام المهام ومشاركة موقعك
            </div>
          )}

          {/* إحصاءات سريعة */}
          <div className="grid grid-cols-3 gap-2 pb-3.5">
            {[
              { label: 'تسليم اليوم', value: String(doneToday.filter((o) => o.status === 'delivered').length), cls: 'text-emerald-300' },
              { label: 'نشطة الآن', value: String(active.length + toReceive.length), cls: 'text-brand-300' },
              { label: 'كاش محصَّل', value: money(collectedToday), cls: 'text-sky-300' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 ring-1 ring-white/10 rounded-lg px-2.5 py-2 text-center hover:bg-white/10 transition-colors">
                <div className={`num font-display text-lg font-bold leading-6 ${s.cls}`}>{s.value}</div>
                <div className="text-[9px] font-semibold text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* الخريطة القابلة للطي */}
          <button onClick={() => setMapOpen((v) => !v)} className="w-full flex items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white py-2 transition-colors">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              خريطتي المباشرة
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-400 num">{active.length + toReceive.length} مهمة</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mapOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${mapOpen ? 'max-h-[340px] mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
            <LiveMap db={db} orders={[...toReceive, ...active]} couriers={[me]} compact className="h-[320px]" />
          </div>
        </header>

        {/* التبويبات */}
        <div className="flex items-center gap-1.5 px-3 pt-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[12px] font-bold ring-1 transition-all ${
                tab === t.key ? 'bg-brand-600 text-white ring-brand-600 shadow-sm shadow-brand-600/30' : 'bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10'
              }`}
            >
              {t.icon}
              {t.label}
              {!!t.count && <span className={`num text-[10px] px-1.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-white/10'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 pb-2">
          {tab === 'tasks' && (
            <>
              {toReceive.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                    <Warehouse className="w-4 h-4" />
                    مُسندة إليك — امسح الباركود للاستلام من المخزن
                  </div>
                  {toReceive.map((o, i) => (
                    <PickupCard key={o.id} order={o} index={i} disabled={!me.online} onScan={() => setScanFor(o)} />
                  ))}
                </div>
              )}

              {active.length === 0 && toReceive.length === 0 && (
                <Empty icon={<Bike className="w-8 h-8" strokeWidth={1.4} />} title="لا مهام نشطة الآن" sub="عندما تُسند إليك شحنات جديدة ستظهر هنا فورًا" />
              )}

              {active.map((o, i) => (
                <OrderCard key={o.id} order={o} me={me} disabled={!me.online}
                  onDeliver={() => setDeliverFor(o)} onFail={() => setFailFor(o)} index={i} />
              ))}
            </>
          )}

          {tab === 'issues' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400">محادثاتك مع مشرف التشغيل</div>
                <Btn sm v="soft" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowIssue(true)}>بلاغ جديد</Btn>
              </div>
              {myIssues.length === 0 ? (
                <Empty icon={<MessageSquare className="w-8 h-8" strokeWidth={1.4} />} title="لا محادثات بلاغات بعد" sub="أنشئ بلاغًا ميدانيًا لتبدأ محادثة مع مشرف التشغيل" action={<Btn v="soft" sm onClick={() => setShowIssue(true)}>بلاغ جديد</Btn>} />
              ) : (
                myIssues.map((iss, i) => (
                  <IssueChatRow key={iss.id} issue={iss} index={i} onOpen={() => setChatFor(iss.id)} />
                ))
              )}
            </>
          )}

          {tab === 'done' && (
            <>
              {doneToday.length === 0 && (
                <Empty icon={<Check className="w-8 h-8" strokeWidth={1.4} />} title="لم تُنجز مهام اليوم بعد" sub="التسليمات وحالات الفشل ستُسجَّل هنا" />
              )}
              {doneToday.map((o, i) => (
                <div key={o.id} className="bg-white/5 ring-1 ring-white/10 rounded-lg p-3.5 flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {o.status === 'delivered' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CodeChip code={o.code} />
                      <span className="text-sm font-bold truncate">{o.customer}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {o.status === 'delivered' ? `المستلم: ${o.recipientName ?? '—'} · ${money(o.cod)}` : `السبب: ${o.failReason ?? '—'}`}
                      {' · '}{timeAgo(o.updatedAt)}
                    </div>
                  </div>
                  {o.pod && (
                    <span className="shrink-0 text-emerald-400" title="مرفقة صورة إثبات تسليم"><Camera className="w-4 h-4" /></span>
                  )}
                </div>
              ))}
            </>
          )}
        </main>

        {/* زر استلام أوردر — دائم الظهور */}
        {tab === 'tasks' && (
          <div className="sticky bottom-0 p-3 bg-gradient-to-t from-ink-2 via-ink-2/95 to-transparent pb-safe">
            <button
              onClick={() => {
                if (!me.online) { toast('اتصل أولًا لاستلام الأوردرات', 'warn'); return; }
                setScanReceiveOpen(true);
              }}
              className={`relative w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 font-display font-bold text-[15px] transition-all duration-200 active:scale-[0.98] ${
                toReceive.length > 0 && me.online
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/40 hover:bg-brand-500'
                  : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
              }`}
            >
              {toReceive.length > 0 && me.online && (
                <>
                  <span className="absolute inset-0 rounded-xl ring-2 ring-brand-400 animate-ping-soft pointer-events-none" />
                  <span className="num absolute -top-2 -end-2 w-6 h-6 rounded-full bg-amber-400 text-ink text-[11px] font-bold flex items-center justify-center ring-2 ring-ink-2 shadow">
                    {toReceive.length}
                  </span>
                </>
              )}
              <Camera className="w-5 h-5" />
              {toReceive.length > 0 ? 'استلام أوردر — امسح كود التتبع' : 'استلام أوردر'}
            </button>
          </div>
        )}
      </div>

      {/* شاشة محادثة البلاغ */}
      {openChat && <IssueChatScreen issue={openChat} me={me} onClose={() => setChatFor(null)} />}

      {/* مسح عام لاستلام أي أوردر مُسند */}
      {scanReceiveOpen && (
        <CameraScanModal
          open
          onClose={() => setScanReceiveOpen(false)}
          expected={toReceive.map((o) => o.code)}
          title="استلام أوردر — مسح كود التتبع"
          verb="مسح ملصق الشحنة"
          onDone={(code) => {
            const match = toReceive.find((o) => o.code.toUpperCase() === code.toUpperCase());
            if (match) courierScanReceive(me, match.id);
          }}
        />
      )}
      {scanFor && (
        <CameraScanModal
          open
          onClose={() => setScanFor(null)}
          expected={scanFor.code}
          title="استلام الشحنة من المخزن"
          verb="مسح ملصق الشحنة"
          onDone={(code) => {
            if (code.toUpperCase() === scanFor.code.toUpperCase()) courierScanReceive(me, scanFor.id);
          }}
        />
      )}
      {deliverFor && <DeliverModal order={deliverFor} me={me} onClose={() => setDeliverFor(null)} />}
      {failFor && <FailModal order={failFor} me={me} onClose={() => setFailFor(null)} />}
      {showIssue && <FieldIssueModal me={me} onClose={() => setShowIssue(false)} />}
    </div>
  );
}

// ── بطاقة الاستلام من المخزن ──
function PickupCard({ order, index, onScan, disabled }: { order: Order; index: number; onScan: () => void; disabled?: boolean }) {
  const zone = zoneById(order.zoneId);
  return (
    <article className="bg-amber-500/[0.07] ring-1 ring-amber-500/30 rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <CodeChip code={order.code} />
        <Badge className="bg-amber-500/15 text-amber-300 ring-amber-500/30">بانتظار الاستلام</Badge>
        {order.cod > 0 && <span className="ms-auto num text-xs font-bold text-brand-300">{money(order.cod)}</span>}
      </div>
      <div className="mt-2">
        <div className="font-bold text-[15px]">{order.customer}</div>
        <p className="text-[12px] text-slate-400 mt-0.5 flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
          {order.address} — {zone?.name}
        </p>
      </div>
      <Btn className="w-full mt-3" v="dark" disabled={disabled} icon={<Camera className="w-4 h-4" />} onClick={onScan}>
        مسح الباركود للاستلام
      </Btn>
    </article>
  );
}

// ── بطاقة مهمة نشطة ──
function OrderCard({ order, me, disabled, onDeliver, onFail, index }: {
  order: Order; me: User; disabled: boolean; onDeliver: () => void; onFail: () => void; index: number;
}) {
  const zone = zoneById(order.zoneId);
  const m = STATUS_META[order.status];
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.address}، ${zone?.name}`)}`;

  return (
    <article className="bg-white/[0.06] ring-1 ring-white/10 rounded-xl p-4 hover:bg-white/[0.09] transition-colors animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <CodeChip code={order.code} />
        <Badge className={m.chip}>{m.label}</Badge>
        {order.cod > 0 && <span className="ms-auto num text-xs font-bold text-brand-300">{money(order.cod)}</span>}
      </div>

      <div className="mt-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[16px]">{order.customer}</span>
          <a href={`tel:${order.phone}`} title="اتصال مباشر بالعميل"
            className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 flex items-center justify-center hover:bg-emerald-500/30 transition-colors active:scale-90">
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a href={gmaps} target="_blank" rel="noreferrer" title="ملاحة Google Maps"
            className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40 flex items-center justify-center hover:bg-sky-500/30 transition-colors active:scale-90">
            <Navigation className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-[12px] text-slate-400 mt-1 leading-5 flex items-start gap-1.5">
          <Warehouse className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
          {order.address} — {zone?.name}
        </p>
      </div>

      <div className="flex gap-2 mt-3.5">
        {order.status === 'handed' && (
          <Btn className="flex-1" disabled={disabled} icon={<Bike className="w-4 h-4" />} onClick={() => courierOnWay(me, order.id)}>في الطريق</Btn>
        )}
        {order.status === 'on_way' && (
          <Btn className="flex-1" v="dark" disabled={disabled} icon={<MapPin className="w-4 h-4" />} onClick={() => courierArrived(me, order.id)}>وصلت للعميل</Btn>
        )}
        {order.status === 'arrived' && (
          <>
            <Btn className="flex-1" v="success" disabled={disabled} icon={<Check className="w-4 h-4" />} onClick={onDeliver}>تسليم</Btn>
            <Btn v="danger" disabled={disabled} icon={<X className="w-4 h-4" />} onClick={onFail}>فشل</Btn>
          </>
        )}
      </div>
    </article>
  );
}

// ── تسليم مع صورة إثبات + اسم المستلم ──
function DeliverModal({ order, me, onClose }: { order: Order; me: User; onClose: () => void }) {
  const [pod, setPod] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!pod) return setErr('التقط صورة إثبات التسليم أولًا');
    if (name.trim().length < 3) return setErr('أدخل اسم المستلم كاملًا');
    courierDeliver(me, order.id, name.trim(), pod);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`تسليم ${order.code}`} w="max-w-md"
      icon={<Check className="w-5 h-5" />} desc="صورة الإثبات أولًا ثم اسم المستلم"
      footer={
        <div className="flex justify-end gap-2">
          <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn v="success" icon={<Check className="w-4 h-4" />} onClick={submit}>تأكيد التسليم</Btn>
        </div>
      }>
      <div className="space-y-4">
        <PodCapture pod={pod} onPod={setPod} />
        <Field label="اسم المستلم" req error={err}>
          <Input value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="الاسم الثلاثي للمستلم" />
        </Field>
        {order.cod > 0 && (
          <div className="flex items-center justify-between bg-brand-50 ring-1 ring-brand-200 rounded-md px-3.5 py-2.5">
            <span className="text-xs font-bold text-brand-800">المبلغ المطلوب تحصيله</span>
            <span className="num font-display text-xl font-bold text-brand-700">{money(order.cod)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── فشل التسليم بسبب محدد ──
function FailModal({ order, me, onClose }: { order: Order; me: User; onClose: () => void }) {
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [note, setNote] = useState('');

  const submit = () => {
    courierFail(me, order.id, reason, note.trim());
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`فشل تسليم ${order.code}`} w="max-w-md" tone="danger"
      icon={<X className="w-5 h-5" />} desc="سجّل سبب فشل التسليم ليتخذ المشرف إجراءً"
      footer={
        <div className="flex justify-end gap-2">
          <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn v="danger" icon={<X className="w-4 h-4" />} onClick={submit}>تسجيل الفشل</Btn>
        </div>
      }>
      <div className="space-y-4">
        <Field label="سبب الفشل" req>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {FAIL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="ملاحظات إضافية">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفاصيل تساعد الإدارة على اتخاذ القرار…" />
        </Field>
      </div>
    </Modal>
  );
}

// ── صف محادثة بلاغ ──
function IssueChatRow({ issue, index, onOpen }: { issue: Issue; index: number; onOpen: () => void }) {
  const last = issue.updates[issue.updates.length - 1];
  const unread = last && last.byRole !== 'courier';
  return (
    <button onClick={onOpen} className="w-full bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.1] rounded-xl p-3.5 text-start transition-colors animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge p={issue.priority} />
        <Badge className={ISSUE_STATUSES[issue.status].chip}>{ISSUE_STATUSES[issue.status].label}</Badge>
        <span className="ms-auto text-[10px] text-slate-500 num">{timeAgo(issue.createdAt)}</span>
      </div>
      <div className="font-bold text-sm mt-1.5">{issue.title}</div>
      {last && (
        <div className={`text-[11px] mt-1 truncate ${unread ? 'text-brand-300 font-semibold' : 'text-slate-400'}`}>
          {last.byRole === 'courier' ? 'أنت: ' : 'الإدارة: '}{last.note}
        </div>
      )}
    </button>
  );
}

// ── شاشة محادثة البلاغ ──
function IssueChatScreen({ issue, me, onClose }: { issue: Issue; me: User; onClose: () => void }) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [issue.updates.length]);
  const locked = issue.status === 'closed';

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    chatOnIssue(me, issue.id, text);
    setText('');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-ink flex justify-center">
      <div className="w-full max-w-md bg-ink-2 flex flex-col min-h-full shadow-2xl">
        <header className="bg-ink-3 px-4 py-3.5 flex items-center gap-3 pt-safe">
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label="رجوع">
            <ChevronDown className="w-5 h-5 rotate-90 rtl:-rotate-90" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[15px] truncate">{issue.title}</div>
            <Badge className={ISSUE_STATUSES[issue.status].chip}>{ISSUE_STATUSES[issue.status].label}</Badge>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          {issue.updates.length === 0 && <p className="text-xs text-slate-500 text-center py-6">لا رسائل بعد — ابدأ المحادثة.</p>}
          {issue.updates.map((u, i) => {
            const mine = u.byRole === 'courier';
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 ${mine ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white/10 ring-1 ring-white/10 rounded-bl-sm'}`}>
                  <div className={`text-[10px] font-bold mb-0.5 ${mine ? 'text-brand-100' : 'text-sky-300'}`}>
                    {mine ? 'أنت' : 'الإدارة'}
                  </div>
                  <div className="text-[13px] leading-6 whitespace-pre-wrap">{u.note}</div>
                  <div className={`text-[9px] mt-1 num ${mine ? 'text-brand-200' : 'text-slate-400'}`} dir="ltr">{timeAgo(u.at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {locked ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3.5 bg-ink border-t border-white/5 pb-safe">
            <Lock className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-500">البلاغ مغلق — المحادثة للقراءة فقط</span>
          </div>
        ) : (
          <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 bg-ink border-t border-white/5 pb-safe">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب رسالتك للمشرف…"
              className="flex-1 bg-white/10 ring-white/15 text-white placeholder:text-slate-500"
            />
            <Btn type="submit" icon={<Send className="w-4 h-4" />} disabled={!text.trim()} aria-label="إرسال">
              إرسال
            </Btn>
          </form>
        )}
      </div>
    </div>
  );
}

// ── بلاغ ميداني جديد ──
function FieldIssueModal({ me, onClose }: { me: User; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState({ title: '', type: 'delay' as IssueType, priority: 'medium' as Priority, orderId: '', note: '' });
  const [err, setErr] = useState('');
  const myOrders = db.orders.filter((o) => o.courierId === me.id && !['delivered', 'returned'].includes(o.status));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 4) return setErr('أدخل عنوانًا واضحًا للبلاغ');
    addIssue(me, { title: f.title.trim(), type: f.type, priority: f.priority, orderId: f.orderId || undefined, note: f.note.trim() });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="بلاغ ميداني جديد" w="max-w-md"
      icon={<Flag className="w-5 h-5" />} desc="سجّل مشكلة ميدانية وسيرد عليك مشرف التشغيل هنا"
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" v="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit" form="field-issue-form" icon={<Flag className="w-4 h-4" />}>إرسال البلاغ</Btn>
        </div>
      }>
      <form id="field-issue-form" onSubmit={submit} className="space-y-3.5">
        <Field label="عنوان البلاغ" req error={err}>
          <Input value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(''); }} placeholder="مثال: العميل لا يرد على الهاتف" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="النوع">
            <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as IssueType })}>
              {(Object.keys(ISSUE_TYPES) as IssueType[]).map((t) => <option key={t} value={t}>{ISSUE_TYPES[t]}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
              {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => <option key={p} value={p}>{p === 'low' ? 'منخفضة' : p === 'medium' ? 'متوسطة' : p === 'high' ? 'عالية' : 'حرجة'}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مرتبط بمهمة (اختياري)">
          <Select value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value })}>
            <option value="">بدون مهمة</option>
            {myOrders.map((o) => <option key={o.id} value={o.id}>{o.code} — {o.customer}</option>)}
          </Select>
        </Field>
        <Field label="التفاصيل">
          <Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="صف الموقف…" />
        </Field>
      </form>
    </Modal>
  );
}
