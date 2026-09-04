// زر «تثبيت التطبيق» — يظهر فقط عندما يتيح المتصفح التثبيت
import { Download } from 'lucide-react';
import { useInstall, promptInstall } from '../lib/install';
import { toast } from '../lib/store';

export default function InstallButton({ v = 'header' }: { v?: 'header' | 'login' }) {
  const { canInstall } = useInstall();
  if (!canInstall) return null;

  const click = async () => {
    const accepted = await promptInstall();
    if (accepted) toast('جارٍ تثبيت طرود على جهازك…', 'success');
  };

  if (v === 'login') {
    return (
      <button
        onClick={click}
        className="group mt-3.5 w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-ink text-white ring-1 ring-ink hover:bg-ink-3 px-4 py-2.5 text-sm font-bold transition-all duration-150 active:scale-[0.98] animate-fade-up shadow-lg shadow-ink/20"
      >
        <span className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Download className="w-4 h-4" strokeWidth={2.2} />
        </span>
        تثبيت التطبيق على هذا الجهاز
        <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">يعمل خارج المتصفح</span>
      </button>
    );
  }

  return (
    <button
      onClick={click}
      title="تثبيت طرود كتطبيق على جهازك"
      className="group inline-flex items-center gap-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white px-2.5 sm:px-3 py-1.5 text-[11px] font-bold shadow-sm shadow-brand-600/30 transition-all duration-150 active:scale-95 animate-pop"
    >
      <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
      <span className="hidden sm:inline">تثبيت التطبيق</span>
    </button>
  );
}
