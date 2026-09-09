import { useState } from 'react';
import {
  LayoutDashboard, Package, Warehouse, Route, Users, FileText, AlertTriangle, Banknote,
  LogOut, Menu, X,
} from 'lucide-react';
import { useMe, logout } from './lib/store';
import { ROLE_LABELS } from './lib/data';
import { Toaster, AppIcon, Avatar } from './ui/kit';
import Login from './screens/Login';
import DisabledAccount from './screens/DisabledAccount';
import CourierApp from './screens/Courier';
import Dashboard from './screens/Dashboard';
import Orders from './screens/Orders';
import Hubs from './screens/Hubs';
import Routes from './screens/Routes';
import Team from './screens/Team';
import Reports from './screens/Reports';
import Issues from './screens/Issues';
import Cod from './screens/Cod';

type Screen = 'dashboard' | 'orders' | 'hubs' | 'routes' | 'team' | 'reports' | 'issues' | 'cod';

const NAV_ITEMS: { id: Screen; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'orders', label: 'الطرود', icon: Package },
  { id: 'hubs', label: 'المراكز', icon: Warehouse },
  { id: 'routes', label: 'المسارات', icon: Route },
  { id: 'team', label: 'الفريق', icon: Users },
  { id: 'issues', label: 'المشاكل', icon: AlertTriangle },
  { id: 'cod', label: 'المالية', icon: Banknote },
  { id: 'reports', label: 'التقارير', icon: FileText },
];

export default function App() {
  const me = useMe();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // إذا لم يكن هناك جلسة → شاشة تسجيل الدخول
  if (!me) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  // إذا كان الحساب معطل
  if (me.active === false) {
    return (
      <>
        <DisabledAccount me={me} onLogout={logout} />
        <Toaster />
      </>
    );
  }

  // إذا كان المستخدم مندوب → تطبيق المندوب
  if (me.role === 'courier') {
    return (
      <>
        <CourierApp />
        <Toaster />
      </>
    );
  }

  // لوحة التحكم الرئيسية
  const CurrentScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard goOrders={() => setScreen('orders')} />;
      case 'orders': return <Orders />;
      case 'hubs': return <Hubs />;
      case 'routes': return <Routes />;
      case 'team': return <Team />;
      case 'reports': return <Reports />;
      case 'issues': return <Issues />;
      case 'cod': return <Cod />;
      default: return <Dashboard />;
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === screen);

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0 z-30">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <AppIcon className="w-8 h-8 rounded-lg" />
          <h1 className="font-display font-bold text-lg text-ink hidden sm:block">طرود</h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="text-end hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{me.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[me.role]}</p>
          </div>
          <Avatar id={me.id} name={me.name} size="w-9 h-9 text-xs" />
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-l border-slate-200 shrink-0">
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = screen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar - Mobile Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative w-64 bg-white shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                <AppIcon className="w-9 h-9 rounded-lg" />
                <div>
                  <p className="font-display font-bold text-ink">طرود</p>
                  <p className="text-xs text-slate-500">{me.name}</p>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = screen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setScreen(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Header */}
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            {currentNav && (
              <>
                <currentNav.icon className="w-5 h-5 text-brand-600" />
                <h2 className="font-semibold text-slate-800">{currentNav.label}</h2>
              </>
            )}
          </div>

          <div className="p-4 md:p-6">
            <CurrentScreen />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
