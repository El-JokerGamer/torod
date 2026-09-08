import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, Package, Warehouse, Route as RouteIcon, Flag, Banknote, BarChart3, Users,
  Menu, LogOut, Database, Wifi, WifiOff, Settings, X, Copy, RefreshCw, AlertTriangle, Bike,
} from 'lucide-react';
import {
  useDB, useMe, useSessionId, useConn, useBootError, logout, startApp, startLiveEngine, retryInit, toast,
} from './lib/store';
import type { Conn } from './lib/store';
import { ROLE_LABELS } from './lib/data';
import type { Role, User } from './lib/data';
import { PROJECT_REF } from './lib/supabase';
import { AppIcon, Avatar, LiveDot, Toaster, Btn } from './ui/kit';
import InstallButton from './ui/InstallButton';
import Login from './screens/Login';
import DisabledAccount from './screens/DisabledAccount';
import Dashboard from './screens/Dashboard';
import Orders from './screens/Orders';
import Hubs from './screens/Hubs';
import Routes from './screens/Routes';
import Issues from './screens/Issues';
import Cod from './screens/Cod';
import Reports from './screens/Reports';
import Team from './screens/Team';
import CourierApp from './screens/Courier';

type Screen = 'dashboard' | 'orders' | 'hubs' | 'routes' | 'issues' | 'cod' | 'reports' | 'team';

const NAV: Record<Role, { key: Screen; label: string; icon: ReactNode }[]> = {
  owner: [
    { key: 'dashboard', label: 'لوحة التشغيل', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: 'orders', label: 'الطلبات', icon: <Package className="w-[18px] h-[18px]" /> },
    { key: 'hubs', label: 'المخازن', icon: <Warehouse className="w-[18px] h-[18px]" /> },
    { key: 'routes', label: 'المسارات', icon: <RouteIcon className="w-[18px] h-[18px]" /> },
    { key: 'issues', label: 'المشاكل والحوادث', icon: <Flag className="w-[18px] h-[18px]" /> },
    { key: 'cod', label: 'التحصيل COD', icon: <Banknote className="w-[18px] h-[18px]" /> },
    { key: 'reports', label: 'التقارير', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { key: 'team', label: 'إدارة الفريق', icon: <Users className="w-[18px] h-[18px]" /> },
  ],
  ops: [
    { key: 'dashboard', label: 'لوحة التشغيل', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: 'orders', label: 'الطلبات', icon: <Package className="w-[18px] h-[18px]" /> },
    { key: 'hubs', label: 'المخازن', icon: <Warehouse className="w-[18px] h-[18px]" /> },
    { key: 'routes', label: 'المسارات', icon: <RouteIcon className="w-[18px] h-[18px]" /> },
    { key: 'issues', label: 'المشاكل والحوادث', icon: <Flag className="w-[18px] h-[18px]" /> },
    { key: 'reports', label: 'التقارير', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  ],
  hub: [
    { key: 'dashboard', label: 'لوحة التشغيل', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: 'orders', label: 'الطلبات', icon: <Package className="w-[18px] h-[18px]" /> },
  ],
  finance: [
    { key: 'cod', label: 'التحصيل COD', icon: <Banknote className="w-[18px] h-[18px]" /> },
    { key: 'issues', label: 'المشاكل والحوادث', icon: <Flag className="w-[18px] h-[18px]" /> },
    { key: 'reports', label: 'التقارير', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  ],
  hr: [
    { key: 'team', label: 'إدارة الفريق', icon: <Users className="w-[18px] h-[18px]" /> },
    { key: 'reports', label: 'التقارير', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { key: 'cod', label: 'التحصيل COD', icon: <Banknote className="w-[18px] h-[18px]" /> },
    { key: 'issues', label: 'المشاكل والحوادث', icon: <Flag className="w-[18px] h-[18px]" /> },
  ],
  courier: [],
};

const TITLES: Record<Screen, string> = {
  dashboard: 'لوحة التشغيل', orders: 'الطلبات', hubs: 'المخازن', routes: 'المسارات',
  issues: 'المشاكل والحوادث', cod: 'التحصيل النقدي COD', reports: 'التقارير', team: 'إدارة الفريق',
};

// ── حارس الأخطاء: يمنع الشاشة البيضاء عند أي عطل أثناء التشغيل ──
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div dir="rtl" className="min-h-dvh flex items-center justify-center bg-paper p-4">
          <div className="max-w-md w-full bg-white rounded-xl ring-1 ring-red-200 shadow-xl p-6 text-center animate-pop">
            <span className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-7 h-7" />
            </span>
            <h1 className="font-display font-bold text-lg text-ink">حدث خطأ غير متوقع</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-5 num" dir="ltr">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SCHEMA_URL = `${import.meta.env.BASE_URL}schema.sql`;

function SetupPanel({ onClose }: { onClose?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sql, setSql] = useState<string | null>(null);
  const conn = useConn();
  const bootError = useBootError();

  useEffect(() => {
    fetch(SCHEMA_URL).then((r) => (r.ok ? r.text() : null)).then(setSql).catch(() => setSql(null));
  }, []);

  const copy = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast('تم نسخ سكريبت إنشاء الجداول', 'info');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('تعذّر النسخ التلقائي — حدّد النص وانسخه يدويًا', 'warn');
    }
  };

  const recheck = () => {
    setChecking(true);
    retryInit();
    setTimeout(() => setChecking(false), 2600);
  };

  useEffect(() => {
    if (conn === 'live' && checking) {
      setChecking(false);
      toast('تم الاتصال بقاعدة البيانات بنجاح', 'success');
      onClose?.();
    }
  }, [conn, checking, onClose]);

  return (
    <div className="text-white">
      <div className="flex items-center gap-2.5 text-amber-300">
        <Database className="w-5 h-5 shrink-0" />
        <h2 className="font-display text-lg font-bold">إنشاء جداول قاعدة البيانات</h2>
        {conn === 'live' && (
          <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> متصل
          </span>
        )}
      </div>
      <p className="text-[13px] text-slate-400 leading-6 mt-2">
        النظام يعمل الآن <b className="text-amber-200">محليًا</b> بكامل وظائفه. لتفعيل الحفظ والمزامنة اللحظية بين جميع الأجهزة،
        شغّل السكريبت أدناه مرة واحدة في مشروع Supabase — سينشئ الجداول الثمانية:
        <span className="num text-brand-300" dir="ltr"> tarood_orders · tarood_users · tarood_hubs · tarood_routes · tarood_issues · tarood_settlements · tarood_seq · tarood_positions</span>.
      </p>

      {bootError && (
        <p dir="ltr" className="num text-[10px] text-red-300/80 bg-red-500/10 ring-1 ring-red-500/25 rounded-md px-2.5 py-1.5 mt-2.5 overflow-x-auto whitespace-nowrap">
          {bootError}
        </p>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <a
          href={`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`}
          target="_blank" rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-petrol-500 hover:bg-petrol-700 text-white rounded-md px-4 py-2.5 text-sm font-bold transition-colors"
        >
          <Settings className="w-4 h-4" />
          فتح SQL Editor في Supabase
        </a>
        <Btn v="dark" disabled={!sql} className="bg-white/10 ring-1 ring-white/15 hover:bg-white/15" icon={<Copy className="w-4 h-4" />} onClick={copy}>
          {copied ? 'تم النسخ ✓' : 'نسخ السكريبت'}
        </Btn>
      </div>

      <pre dir="ltr" className="num text-[10.5px] leading-5 bg-ink-3 rounded-lg ring-1 ring-white/10 p-3.5 overflow-auto max-h-56 text-emerald-200/90 select-all mt-3.5">
        {sql ?? '-- جارٍ تحميل سكريبت إنشاء الجداول…'}
      </pre>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={recheck}
          disabled={checking}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-md px-4 py-2.5 text-sm font-bold transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'جارٍ التحقق من الجداول…' : 'تحقّق وأكمل الإعداد'}
        </button>
        {onClose && (
          <Btn v="ghost" className="text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose}>
            لاحقًا — الاستمرار محليًا
          </Btn>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-2.5">
        حساب البداية بعد الإعداد: <span className="num text-slate-300" dir="ltr">owner / 1234</span> — يُنشأ تلقائيًا مع الجداول.
      </p>
    </div>
  );
}

function ConnBanner({ conn, onSetup }: { conn: Conn; onSetup: () => void }) {
  if (conn === 'live' || conn === 'connecting') return null;
  const isSetup = conn === 'setup';
  return (
    <div className={`${isSetup ? 'bg-amber-500' : 'bg-red-600'} text-white px-3 sm:px-4 py-2 flex items-center gap-2.5 text-[12px] font-bold animate-fade-up`}>
      {isSetup ? <Database className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
      <span className="min-w-0 truncate">
        {isSetup
          ? 'قاعدة البيانات غير مُعدّة بعد — النظام يعمل محليًا على هذا الجهاز فقط'
          : 'تعذّر الاتصال بقاعدة البيانات — النظام يعمل مؤقتًا بالوضع المحلي'}
      </span>
      <button
        onClick={onSetup}
        className="ms-auto shrink-0 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 ring-1 ring-white/40 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        {isSetup ? 'إعداد القاعدة الآن' : 'إعادة المحاولة'}
      </button>
    </div>
  );
}

function ConnChip({ compact = false }: { compact?: boolean }) {
  const conn = useConn();
  const map = {
    live: { label: 'Supabase متصل', Icon: Wifi, cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30' },
    connecting: { label: 'جارٍ الاتصال…', Icon: RefreshCw, cls: 'text-slate-300 bg-white/5 ring-white/10' },
    setup: { label: 'القاعدة غير معدّة', Icon: Database, cls: 'text-amber-300 bg-amber-500/10 ring-amber-500/30' },
    local: { label: 'وضع محلي', Icon: WifiOff, cls: 'text-red-300 bg-red-500/10 ring-red-500/30' },
  }[conn];
  const I = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-[10px] font-bold ${map.cls}`}>
      <I className={`w-3.5 h-3.5 ${conn === 'connecting' ? 'animate-spin' : ''}`} />
      {!compact && map.label}
    </span>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden lg:flex flex-col items-end leading-tight shrink-0">
      <span className="num text-sm font-bold text-white" dir="ltr">{now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      <span className="text-[9px] text-slate-400 whitespace-nowrap">{now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
    </span>
  );
}

function Splash() {
  return (
    <div className="min-h-dvh bg-ink bg-grid-dark flex flex-col items-center justify-center gap-6 text-white" dir="rtl">
      <AppIcon className="w-20 h-20 rounded-2xl shadow-2xl shadow-brand-600/40 animate-pop ring-2 ring-white/10" />
      <div className="text-center animate-fade-up">
        <div className="font-display text-4xl font-extrabold leading-none">طرود</div>
        <div className="text-[10px] tracking-[0.35em] text-brand-300 font-mono mt-2" dir="ltr">TAROUD OPS</div>
      </div>
      <div className="flex flex-col items-center gap-2.5">
        <span className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-400">جارٍ الاتصال بقاعدة البيانات…</span>
      </div>
    </div>
  );
}

export default function App() {
  const conn = useConn();
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => { startApp(); }, []);
  useEffect(() => startLiveEngine(), []);

  const sessionId = useSessionId();
  const me = useMe();

  // الجلسة تشير لمستخدم لم يعد موجودًا (حُذف لحظيًا) → خروج تلقائي
  useEffect(() => {
    if (sessionId && !me) logout();
  }, [sessionId, me]);

  const setupModal = setupOpen ? (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]" onClick={() => setSetupOpen(false)} />
      <div className="relative w-full max-w-2xl bg-ink-2 ring-1 ring-white/10 rounded-xl shadow-2xl p-5 sm:p-6 animate-pop max-h-[90vh] overflow-y-auto">
        <button onClick={() => setSetupOpen(false)} className="absolute top-3 end-3 text-slate-400 hover:text-white p-1" aria-label="إغلاق">
          <X className="w-5 h-5" />
        </button>
        <SetupPanel onClose={() => setSetupOpen(false)} />
      </div>
    </div>
  ) : null;

  if (conn === 'connecting') {
    return (
      <ErrorBoundary>
        <Splash />
        <Toaster />
      </ErrorBoundary>
    );
  }

  if (!sessionId || !me) {
    return (
      <ErrorBoundary>
        <div className="min-h-dvh flex flex-col">
          <ConnBanner conn={conn} onSetup={() => setSetupOpen(true)} />
          <div className="flex-1 flex flex-col min-h-0"><Login /></div>
        </div>
        <Toaster />
        {setupModal}
      </ErrorBoundary>
    );
  }

  if (me.active === false) {
    return (
      <ErrorBoundary>
        <div className="min-h-dvh flex flex-col">
          <div className="flex-1 flex flex-col min-h-0"><DisabledAccount me={me} onLogout={logout} /></div>
        </div>
        <Toaster />
      </ErrorBoundary>
    );
  }

  if (me.role === 'courier') {
    return (
      <ErrorBoundary>
        <div className="min-h-dvh flex flex-col">
          <ConnBanner conn={conn} onSetup={() => setSetupOpen(true)} />
          <div className="flex-1 flex flex-col min-h-0"><CourierApp /></div>
        </div>
        <Toaster />
        {setupModal}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Shell me={me} conn={conn} onSetup={() => setSetupOpen(true)} setupModal={setupModal} />
      <Toaster />
    </ErrorBoundary>
  );
}

function Shell({ me, conn, onSetup, setupModal }: { me: User; conn: Conn; onSetup: () => void; setupModal: ReactNode }) {
  const nav = NAV[me.role];
  const [screen, setScreen] = useState<Screen>(nav[0]?.key ?? 'dashboard');
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!nav.some((n) => n.key === screen)) setScreen(nav[0]?.key ?? 'dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.role]);

  const t = TITLES[screen];
  const tabs = nav.slice(0, 4);

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
      {nav.map((n) => {
        const active = screen === n.key;
        return (
          <button
            key={n.key}
            onClick={() => { setScreen(n.key); onPick?.(); }}
            title={n.label}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 group ${
              active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className={`shrink-0 transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`}>{n.icon}</span>
            <span className="truncate">{n.label}</span>
            {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />}
          </button>
        );
      })}
    </nav>
  );

  const SideFooter = () => (
    <div className="p-3 space-y-2 border-t border-white/5">
      <div className="flex items-center gap-2.5 bg-white/5 ring-1 ring-white/10 rounded-md p-2">
        <Avatar id={me.id} name={me.name} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white truncate">{me.name}</div>
          <div className="text-[10px] text-brand-300">{ROLE_LABELS[me.role]}</div>
        </div>
        <button onClick={() => logout()} title="تسجيل الخروج" className="p-1.5 rounded-md text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper">
      <ConnBanner conn={conn} onSetup={onSetup} />
      {setupModal}

      {/* الشريط الجانبي — مكتب */}
      <aside className="hidden md:flex fixed inset-y-0 start-0 w-16 xl:w-60 flex-col bg-ink bg-grid-dark border-e border-white/5 z-40">
        <div className="flex items-center gap-2.5 px-3 xl:px-5 h-16 border-b border-white/5">
          <AppIcon className="w-9 h-9 rounded-lg" />
          <div className="hidden xl:block">
            <div className="font-display text-xl font-extrabold text-white leading-none">طرود</div>
            <div className="text-[8px] tracking-[0.3em] text-brand-300 font-mono mt-0.5" dir="ltr">TAROUD OPS</div>
          </div>
        </div>
        <NavList />
        <SideFooter />
      </aside>

      {/* المحتوى */}
      <div className="md:ms-16 xl:ms-60 flex flex-col min-h-dvh">
        <header className="sticky top-0 z-30 bg-ink text-white shadow-lg shadow-ink/20 pt-safe">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14">
            <button onClick={() => setDrawer(true)} className="md:hidden p-2 -ms-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0" aria-label="القائمة">
              <Menu className="w-5 h-5" />
            </button>
            <span className="md:hidden shrink-0"><AppIcon className="w-8 h-8 rounded-lg" /></span>
            <h1 className="font-display font-bold text-base md:text-lg truncate min-w-0">{t}</h1>
            <div className="ms-auto flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
              <span className="md:hidden"><ConnChip compact /></span>
              <span className="hidden md:inline-flex"><ConnChip /></span>
              <LiveClock />
              <InstallButton />
              <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/5 ring-1 ring-white/10 text-brand-300 rounded-full px-3 py-1.5">
                {me.role === 'courier' ? <Bike className="w-3.5 h-3.5" /> : null}
                {ROLE_LABELS[me.role]}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-[1600px] w-full mx-auto pb-24 md:pb-6">
          <div key={screen} className="animate-fade-up">
            {screen === 'dashboard' && <Dashboard goOrders={() => setScreen('orders')} />}
            {screen === 'orders' && <Orders />}
            {screen === 'hubs' && <Hubs />}
            {screen === 'routes' && <Routes />}
            {screen === 'issues' && <Issues />}
            {screen === 'cod' && <Cod />}
            {screen === 'reports' && <Reports />}
            {screen === 'team' && <Team />}
          </div>
        </main>
      </div>

      {/* درج القائمة — جوال */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/55 animate-fade" onClick={() => setDrawer(false)} />
          {/* درج القائمة مثبّت فيزيائيًا على الحافة اليمنى وينزلق من اليمين دائمًا */}
          <aside className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-ink bg-grid-dark flex flex-col shadow-2xl animate-slide-in-right pt-safe">
            <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/5">
              <AppIcon className="w-9 h-9 rounded-lg" />
              <div>
                <div className="font-display text-xl font-extrabold text-white leading-none">طرود</div>
                <div className="text-[8px] tracking-[0.3em] text-brand-300 font-mono mt-0.5" dir="ltr">TAROUD OPS</div>
              </div>
              <button onClick={() => setDrawer(false)} className="ms-auto p-2 text-slate-400 hover:text-white" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList onPick={() => setDrawer(false)} />
            <SideFooter />
          </aside>
        </div>
      )}

      {/* شريط التبويبات السفلي — جوال */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink border-t border-white/10 pb-safe">
        <div className="flex items-stretch">
          {tabs.map((n) => {
            const active = screen === n.key;
            return (
              <button key={n.key} onClick={() => setScreen(n.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-bold transition-colors ${active ? 'text-brand-400' : 'text-slate-500'}`}>
                {n.icon}
                {n.label.split(' ')[0]}
                {active && <span className="w-1 h-1 rounded-full bg-brand-400" />}
              </button>
            );
          })}
          {nav.length > 4 && (
            <button onClick={() => setDrawer(true)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-bold transition-colors ${!tabs.some((x) => x.key === screen) ? 'text-brand-400' : 'text-slate-500'}`}>
              <Menu className="w-[18px] h-[18px]" />
              المزيد
            </button>
          )}
        </div>
      </nav>

      <span className="hidden"><LiveDot /></span>
    </div>
  );
}
