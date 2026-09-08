import { Lock, LogOut, Users, Headphones } from 'lucide-react';
import type { User } from '../lib/data';
import { AppIcon, Btn } from '../ui/kit';

export default function DisabledAccount({ me, onLogout }: { me: User; onLogout: () => void }) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center bg-ink bg-grid-dark p-4 text-white pt-safe pb-safe">
      <div className="w-full max-w-md bg-ink-2 ring-1 ring-white/10 rounded-2xl shadow-2xl p-7 text-center animate-pop">
        <AppIcon className="w-14 h-14 rounded-2xl mx-auto mb-4 opacity-80" />
        <span className="w-16 h-16 mx-auto rounded-full bg-red-500/15 ring-1 ring-red-500/40 text-red-400 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </span>
        <h1 className="font-display text-2xl font-bold">حسابك معطّل</h1>
        <p className="text-sm text-slate-400 leading-7 mt-3">
          عذرًا <b className="text-slate-200">{me.name}</b>، تم تعطيل حسابك من قِبل الإدارة،
          لذا لا يمكنك الوصول إلى النظام حاليًا.
        </p>

        <div className="mt-5 space-y-2.5 text-start">
          <div className="flex items-center gap-3 bg-white/5 ring-1 ring-white/10 rounded-lg px-4 py-3">
            <Users className="w-5 h-5 text-petrol-500 shrink-0" />
            <span className="text-xs text-slate-300 leading-5">تواصل مع <b className="text-white">الموارد البشرية</b> لمراجعة حالة حسابك</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 ring-1 ring-white/10 rounded-lg px-4 py-3">
            <Headphones className="w-5 h-5 text-brand-400 shrink-0" />
            <span className="text-xs text-slate-300 leading-5">أو تواصل مع <b className="text-white">مشرف العمليات</b> لإعادة التفعيل</span>
          </div>
        </div>

        <Btn v="danger" className="w-full mt-6" icon={<LogOut className="w-4 h-4" />} onClick={onLogout}>
          تسجيل الخروج
        </Btn>
      </div>
    </div>
  );
}
