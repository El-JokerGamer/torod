import { useState } from 'react';
import { UserRound, Lock, Eye, AlertTriangle } from 'lucide-react';
import { login, useConn } from '../lib/store';
import { Btn, Input, Field, AppIcon } from '../ui/kit';
import InstallButton from '../ui/InstallButton';

export default function Login() {
  const conn = useConn();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const r = login(username, password);
      setBusy(false);
      if (!r.ok) { setError(r.error); setShake((s) => s + 1); }
    }, 450);
  };

  return (
    <div className="flex-1 min-h-0 flex bg-ink text-white overflow-hidden">
      {/* لوحة العلامة */}
      <div className="hidden lg:flex flex-col justify-center items-start w-[46%] relative bg-ink-2 bg-grid-dark p-12 border-e border-white/5">
        <svg className="absolute inset-0 w-full h-full opacity-[0.4]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M -5 20 C 20 15, 35 35, 55 30 S 90 45, 110 38" stroke="#e8501e" strokeWidth="0.35" fill="none" strokeDasharray="3 3" className="animate-dashmove" />
          <path d="M -5 55 C 25 60, 40 45, 60 52 S 95 60, 110 55" stroke="#41607c" strokeWidth="0.35" fill="none" strokeDasharray="3 3" className="animate-dashmove" style={{ animationDuration: '10s' }} />
          <path d="M -5 82 C 20 78, 45 90, 70 82 S 95 75, 110 80" stroke="#177f79" strokeWidth="0.35" fill="none" strokeDasharray="3 3" className="animate-dashmove" style={{ animationDuration: '12s' }} />
          {[[22, 24], [55, 30], [84, 41], [30, 57], [62, 52], [48, 85], [78, 80]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="2.2" fill="#e8501e" opacity="0.25" className="animate-ping-soft" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.4}s` }} />
              <circle cx={x} cy={y} r="0.9" fill="#e8501e" opacity="0.9" />
            </g>
          ))}
        </svg>

        <div className="relative animate-fade-up">
          <div className="flex items-center gap-4">
            <AppIcon className="w-16 h-16 rounded-2xl shadow-2xl shadow-brand-600/40 rotate-3 ring-2 ring-white/10" />
            <div>
              <div className="font-display text-6xl font-extrabold leading-none">طرود</div>
              <div className="text-[11px] tracking-[0.35em] text-brand-300 font-mono mt-2" dir="ltr">TAROUD OPS</div>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-3 text-slate-500">
            <span className="h-px w-10 bg-brand-500/60" />
            <span className="text-xs font-bold tracking-wide">نظام إدارة الشحن والتوصيل</span>
          </div>
        </div>
      </div>

      {/* نموذج الدخول */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-paper text-slate-800 pt-safe pb-safe overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <AppIcon className="w-12 h-12 rounded-xl shadow-lg shadow-brand-600/30" />
            <div>
              <span className="font-display text-3xl font-extrabold text-ink block leading-none">طرود</span>
              <span className="text-[9px] tracking-[0.3em] text-brand-600 font-mono" dir="ltr">TAROUD OPS</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink">تسجيل الدخول</h2>

          <div className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 ring-1 ${
            conn === 'live' ? 'text-emerald-700 bg-emerald-50 ring-emerald-600/25' : 'text-amber-700 bg-amber-50 ring-amber-600/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conn === 'live' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-amber-500 animate-blink'}`} />
            {conn === 'live' ? 'متصل بقاعدة البيانات' : conn === 'connecting' ? 'جارٍ الاتصال…' : 'وضع محلي'}
          </div>

          <form key={shake} onSubmit={submit} className={`mt-5 bg-white rounded-xl ring-1 ring-slate-900/8 shadow-sm p-5 space-y-4 ${shake ? 'animate-shake' : ''}`}>
            <Field label="اسم المستخدم">
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><UserRound className="w-4 h-4" /></span>
                <Input dir="ltr" className="ps-9 num" placeholder="owner" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} autoComplete="username" />
              </div>
            </Field>
            <Field label="كلمة المرور">
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                <Input dir="ltr" type={showPass ? 'text' : 'password'} className="ps-9 pe-10 num" placeholder="••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="إظهار كلمة المرور">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </Field>
            {error && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2 animate-fade-up">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <Btn type="submit" disabled={busy} className="w-full py-2.5 text-base">
              {busy ? 'جارٍ التحقق…' : 'دخول'}
            </Btn>
          </form>

          <InstallButton v="login" />
        </div>
      </div>
    </div>
  );
}
