import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X, Package, AlertTriangle, Check, Zap, Trash2 } from 'lucide-react';
import { STATUS_META, PRIORITIES, avatarColor, initials } from '../lib/data';
import type { OrderStatus, Priority } from '../lib/data';
import { useToasts } from '../lib/store';

export const APP_ICON = 'https://api.whacka.app/storage/v1/object/public/app-images/projects/08117c0b-69c1-43a4-aa88-58d97737a30c/icon-192.png?v=1787953485008';

export function AppIcon({ className = 'w-10 h-10 rounded-xl' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`${className} bg-brand-600 flex items-center justify-center text-white shrink-0`}>
        <Package className="w-[62%] h-[62%]" strokeWidth={1.7} />
      </span>
    );
  }
  return <img src={APP_ICON} alt="شعار طرود" onError={() => setFailed(true)} className={`${className} object-cover shrink-0`} draggable={false} />;
}

export function Btn({
  v = 'primary', sm, icon, children, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { v?: 'primary' | 'soft' | 'ghost' | 'danger' | 'dark' | 'success'; sm?: boolean; icon?: ReactNode }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap';
  const sizes = sm ? 'text-xs px-2.5 py-1.5' : 'text-sm px-4 py-2';
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30',
    soft: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100',
    ghost: 'text-slate-600 hover:bg-slate-200/60',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/25',
    dark: 'bg-ink text-white hover:bg-ink-3',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/25',
  }[v];
  return (
    <button className={`${base} ${sizes} ${variants} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}

export const Badge = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className}`}>{children}</span>
);

export const StatusBadge = ({ s }: { s: OrderStatus }) => {
  const m = STATUS_META[s];
  return (
    <Badge className={m.chip}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  );
};

export const PriorityBadge = ({ p }: { p: Priority }) => {
  const m = PRIORITIES[p];
  return <Badge className={m.chip}>{m.label}</Badge>;
};

export const CodeChip = ({ code }: { code: string }) => (
  <span className="num inline-flex items-center rounded bg-ink text-brand-300 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider" dir="ltr">{code}</span>
);

export function Card({ title, sub, actions, children, className = '', pad = true }: {
  title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`bg-white rounded-lg ring-1 ring-slate-900/8 shadow-[0_1px_2px_rgba(12,22,34,0.05)] ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{title}</h3>
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export const Stat = ({ label, value, sub, icon, tone = 'brand' }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; tone?: 'brand' | 'green' | 'red' | 'blue' | 'amber' | 'ink';
}) => {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 border-brand-500',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-500',
    red: 'bg-red-50 text-red-600 border-red-500',
    blue: 'bg-blue-50 text-blue-600 border-blue-500',
    amber: 'bg-amber-50 text-amber-600 border-amber-500',
    ink: 'bg-slate-100 text-slate-600 border-slate-400',
  }[tone];
  return (
    <div className="bg-white rounded-lg ring-1 ring-slate-900/8 px-4 py-3.5 flex items-start gap-3 border-s-4 border-transparent hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group" style={{ borderInlineStartColor: tones.split(' ')[2] }}>
      <div className={`w-10 h-10 shrink-0 rounded-md flex items-center justify-center ${tones} group-hover:scale-110 transition-transform duration-200`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="font-display text-[26px] leading-8 font-bold text-ink num truncate">{value}</div>
        {sub && <div className="text-[11px] text-slate-500 truncate">{sub}</div>}
      </div>
    </div>
  );
};

// قفل تمرير الصفحة خلف النوافذ المنبثقة (مع تعويض عرض شريط التمرير)
let lockCount = 0;
function setScrollLock(locked: boolean) {
  if (locked) {
    lockCount++;
    if (lockCount === 1) {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = 'hidden';
      if (sw > 0) document.documentElement.style.paddingInlineEnd = `${sw}px`;
    }
  } else {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingInlineEnd = '';
    }
  }
}

export function Modal({ open, onClose, title, desc, icon, children, w = 'max-w-lg', tone, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; desc?: ReactNode; icon?: ReactNode;
  children: ReactNode; w?: string; tone?: 'danger'; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    setScrollLock(true);
    return () => { window.removeEventListener('keydown', h); setScrollLock(false); };
  }, [open, onClose]);
  if (!open) return null;
  const danger = tone === 'danger';
  // يُركَّب في document.body مباشرة ليتجاوز أي transform على أسلافه (يثبت الموضع على الجوال)
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      {/* حجاب: أدكن على الهاتف ليبرز الورقة كطبقة عائمة فوق المحتوى · فاتح على الكمبيوتر */}
      <div className="absolute inset-0 bg-ink/40 md:bg-paper/85 animate-fade" onClick={onClose} />

      {/* لوحة القوائم: مثبّتة صراحةً بالحافة السفلية على الهاتف (ورقة سفلية بارتفاع المحتوى) · بجهة اليمين من الأعلى على الكمبيوتر */}
      <aside className={`absolute inset-x-0 bottom-0 max-h-[85dvh] bg-paper flex flex-col overflow-hidden rounded-t-2xl animate-fade-up
        md:inset-x-auto md:bottom-auto md:top-0 md:right-0 md:h-[93dvh] md:max-h-none md:w-[84%] lg:w-[66%] xl:w-1/2 md:min-w-[560px] md:max-w-[980px]
        md:rounded-t-none md:rounded-b-2xl md:rounded-l-2xl ring-1 ${danger ? 'ring-red-300/70' : 'ring-ink/10'}
        shadow-[0_-16px_50px_-12px_rgba(12,22,34,0.55)] md:shadow-[-24px_24px_80px_-24px_rgba(12,22,34,0.4)]
        md:animate-slide-in-right`}>
        {/* شريط علوي بلون الهوية */}
        <div className={`h-1.5 shrink-0 ${danger ? 'bg-red-500' : 'bg-brand-600'}`} />

        {/* مقبض سحب (جوال فقط) — يُشير إلى أن اللوحة ورقة سفلية */}
        <button onClick={onClose} className="md:hidden pt-2.5 pb-1 flex justify-center shrink-0" aria-label="إغلاق">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </button>

        <header className={`flex items-center gap-3 sm:gap-3.5 px-4 sm:px-7 pt-2 sm:pt-5 pb-3 sm:pb-4 border-b shrink-0 ${danger ? 'border-red-100 bg-red-50/70' : 'border-slate-200/70 bg-white'}`}>
          {icon && (
            <span className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform duration-200 hover:scale-105
              ${danger ? 'bg-red-600 text-white shadow-red-600/30' : 'bg-brand-600 text-white shadow-brand-600/30'}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className={`font-display font-bold text-lg sm:text-xl leading-tight ${danger ? 'text-red-700' : 'text-ink'}`}>{title}</h3>
            {desc && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-5">{desc}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-ink hover:bg-slate-200/70 rounded-md p-2 transition-colors shrink-0 active:scale-90" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5">
          <div className="w-full max-w-[700px] mx-auto">{children}</div>
        </div>

        {footer && (
          <footer className={`border-t px-4 sm:px-7 py-3 sm:py-4 shrink-0
            pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4
            [&>div]:grid [&>div]:grid-cols-2 [&>div]:gap-2 [&>div]:w-full
            sm:[&>div]:flex sm:[&>div]:justify-end sm:[&>div]:w-auto sm:[&>div]:gap-2
            ${danger ? 'border-red-100 bg-red-50/50' : 'border-slate-200/70 bg-white'}`}>
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body
  );
}

/** فاصل قسم داخل نماذج الإدخال: أيقونة + عنوان + خط */
export function FormSection({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2 first:pt-0">
      {icon && (
        <span className="w-6 h-6 rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-200 flex items-center justify-center shrink-0">
          {icon}
        </span>
      )}
      <span className="text-[11px] font-bold text-ink tracking-wide whitespace-nowrap">{label}</span>
      <span className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    setScrollLock(true);
    return () => { window.removeEventListener('keydown', h); setScrollLock(false); };
  }, [open, onClose]);
  // يُركَّب في document.body مباشرة ليتجاوز أي transform على أسلافه (يثبت الموضع على الجوال)
  return createPortal(
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* حجاب: أدكن على الهاتف ليبرز الورقة كطبقة عائمة · فاتح على الكمبيوتر */}
      <div className={`absolute inset-0 bg-ink/40 md:bg-paper/85 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      {/* هاتف: ورقة سفلية مثبّتة صراحةً بالحافة السفلية بارتفاع المحتوى · كمبيوتر: لوحة إجراءات بجهة اليمين من الأعلى — نفس تصميم قوائم الإدخال */}
      <aside className={`absolute inset-x-0 bottom-0 max-h-[85dvh] bg-paper flex flex-col overflow-hidden rounded-t-2xl
        md:inset-x-auto md:bottom-auto md:top-0 md:right-0 md:h-[93dvh] md:max-h-none md:w-[84%] lg:w-[66%] xl:w-1/2 md:min-w-[560px] md:max-w-[980px]
        md:rounded-t-none md:rounded-b-2xl md:rounded-l-2xl md:ring-1 md:ring-ink/10
        shadow-[0_-16px_50px_-12px_rgba(12,22,34,0.55)] md:shadow-[-24px_24px_80px_-24px_rgba(12,22,34,0.4)]
        transition-[transform,visibility] duration-300 ease-[cubic-bezier(.16,1,.3,1)]
        ${open ? 'translate-y-0 md:translate-x-0 visible' : 'translate-y-full md:translate-y-0 md:translate-x-full invisible'}`}>
        <button onClick={onClose} className="md:hidden pt-2.5 pb-0.5 flex justify-center shrink-0" aria-label="إغلاق">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </button>
        {children}
      </aside>
    </div>,
    document.body
  );
}

export function Confirm({ open, onClose, onYes, title, msg, yes = 'حذف نهائي' }: {
  open: boolean; onClose: () => void; onYes: () => void; title: string; msg: ReactNode; yes?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} tone="danger" w="max-w-md"
      icon={<AlertTriangle className="w-5 h-5" />}
      footer={
        <div className="flex justify-end gap-2">
          <Btn v="ghost" onClick={onClose}>تراجع</Btn>
          <Btn v="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => { onYes(); onClose(); }}>{yes}</Btn>
        </div>
      }>
      <div className="text-sm text-slate-600 leading-6">{msg}</div>
    </Modal>
  );
}

export function Field({ label, error, children, hint, req }: { label: string; error?: string; hint?: string; children: ReactNode; req?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{req && <span className="text-red-500 ms-1">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-red-600 font-semibold mt-1">{error}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-md bg-white ring-1 ring-slate-300/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 transition-shadow';

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`${inputCls} ${p.className ?? ''}`} />
);
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${inputCls} ${p.className ?? ''}`} />
);
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${inputCls} min-h-20 ${p.className ?? ''}`} />
);

export function Empty({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-400 mb-3">
        {icon ?? <Package className="w-8 h-8" strokeWidth={1.4} />}
      </div>
      <div className="font-display font-bold text-slate-700">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-1 max-w-60">{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Avatar = ({ id, name, size = 'w-8 h-8 text-[11px]' }: { id: string; name: string; size?: string }) => (
  <span className={`${size} ${avatarColor(id)} rounded-full flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-white/70`}>
    {initials(name)}
  </span>
);

export const Chip = ({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ring-1 ${
      active ? 'bg-ink text-white ring-ink shadow-sm' : 'bg-white text-slate-600 ring-slate-300/70 hover:ring-slate-400 hover:bg-slate-50'
    }`}
  >
    {children}
    {count !== undefined && <span className={`num text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>}
  </button>
);

export const LiveDot = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot ${className}`} />
);

export function Toaster() {
  const toasts = useToasts();
  const meta = {
    success: { cls: 'bg-emerald-600', Icon: Check },
    error: { cls: 'bg-red-600', Icon: AlertTriangle },
    warn: { cls: 'bg-amber-500', Icon: AlertTriangle },
    info: { cls: 'bg-ink-3', Icon: Zap },
  };
  return (
    <div className="fixed bottom-20 md:bottom-5 start-5 z-[80] flex flex-col gap-2 max-w-sm" dir="rtl">
      {toasts.map((t) => {
        const m = meta[t.kind];
        const I = m.Icon;
        return (
          <div key={t.id} className={`${m.cls} text-white rounded-lg shadow-xl px-3.5 py-2.5 text-sm font-semibold flex items-center gap-2.5 animate-fade-up`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <I className="w-3.5 h-3.5" strokeWidth={2.4} />
            </span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}
