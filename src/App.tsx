import { useState } from 'react';
import { Check, Copy, ExternalLink, ChevronDown, ChevronUp, Shield, Globe, Server, Lock, Zap, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── أنواع البيانات ─────────────────────────────────────────────
interface SubStep {
  text: string;
  code?: string;
  code2?: string;
  isLink?: boolean;
  note?: string;
  result?: string;
}

interface StepData {
  id: number;
  title: string;
  icon: LucideIcon;
  color: string;
  description: string;
  substeps: SubStep[];
}

// ─── بيانات الخطوات ─────────────────────────────────────────────
const steps: StepData[] = [
  {
    id: 1,
    title: 'إنشاء حساب على DuckDNS',
    icon: Globe,
    color: 'from-blue-500 to-cyan-500',
    description: 'DuckDNS هي خدمة مجانية تُعطيك دومين فرعي مثل: tarod.duckdns.org',
    substeps: [
      {
        text: 'افتح الموقع',
        code: 'https://www.duckdns.org',
        isLink: true,
        note: 'موقع DuckDNS المجاني',
      },
      {
        text: 'سجّل الدخول بحساب Google أو GitHub أو Twitter',
        note: 'لا تحتاج لإنشاء حساب جديد — استخدم حسابك الموجود',
      },
      {
        text: 'أنشئ دومين فرعي جديد',
        note: 'مثلاً: اكتب "tarod" في خانة subdomain واضغط "add domain"',
        result: 'tarod.duckdns.org',
      },
    ],
  },
  {
    id: 2,
    title: 'ربط الدومين بخادمك',
    icon: Server,
    color: 'from-purple-500 to-pink-500',
    description: 'اجعل الدومين يشير إلى عنوان IP الخاص بخادمك على Wispbyte',
    substeps: [
      {
        text: 'في صفحة DuckDNS، ستجد الدومين الجديد',
        note: 'سيظهر لك tarod.duckdns.org في القائمة',
      },
      {
        text: 'اضغط على أيقونة القلم ✏️ للتعديل',
        note: 'ستظهر لك خانة IP address',
      },
      {
        text: 'أدخل عنوان IP الخاص بخادمك',
        code: '78.154.103.30',
        note: 'هذا هو IP خادمك على Wispbyte',
      },
      {
        text: 'اضغط "update ip" للحفظ',
        note: 'DuckDNS سيُحدّث تلقائياً كل 5 دقائق',
        result: 'tarod.duckdns.org → 78.154.103.30',
      },
    ],
  },
  {
    id: 3,
    title: 'تثبيت Caddy على الخادم',
    icon: Shield,
    color: 'from-emerald-500 to-teal-500',
    description: 'Caddy هو سيرفر ويب خفيف يُعطيك HTTPS تلقائياً مع Let\'s Encrypt',
    substeps: [
      {
        text: 'افتح Terminal من لوحة Wispbyte',
        note: 'اذهب لـ Servers → Server → Console/File Manager/Terminal',
      },
      {
        text: 'نزّل Caddy',
        code: 'curl -L -o caddy https://github.com/caddyserver/caddy/releases/latest/download/caddy_linux_amd64',
        note: 'أو استخدم هذا الأمر إذا كان النظام ARM:',
        code2: 'curl -L -o caddy https://github.com/caddyserver/caddy/releases/latest/download/caddy_linux_arm64',
      },
      {
        text: 'اعطِ صلاحيات التشغيل',
        code: 'chmod +x caddy',
      },
      {
        text: 'تحقق من التثبيت',
        code: './caddy version',
        note: 'يجب أن يظهر رقم الإصدار مثل v2.x.x',
      },
    ],
  },
  {
    id: 4,
    title: 'تشغيل Caddy مع HTTPS',
    icon: Lock,
    color: 'from-amber-500 to-orange-500',
    description: 'شغّل Caddy كـ reverse proxy — سيقوم تلقائياً بالحصول على شهادة SSL',
    substeps: [
      {
        text: 'شغّل هذا الأمر (استبدل الدومين بدومينك)',
        code: './caddy reverse-proxy --from tarod.duckdns.org --to localhost:11280',
        note: '⚠️ استبدل tarod.duckdns.org بالدومين الذي أنشأته في DuckDNS',
      },
      {
        text: 'Caddy سيقوم تلقائياً بـ:',
        result: '✅ الحصول على شهادة SSL من Let\'s Encrypt\n✅ تحويل HTTPS → HTTP داخلياً\n✅ إعادة توجيه http → https\n✅ تجديد الشهادة تلقائياً',
      },
      {
        text: 'افتح الموقع من المتصفح',
        code: 'https://tarod.duckdns.org',
        isLink: true,
        note: 'الكاميرا ستعمل الآن! 🎉',
      },
    ],
  },
  {
    id: 5,
    title: 'التشغيل الدائم (Background)',
    icon: Zap,
    color: 'from-red-500 to-rose-500',
    description: 'اجعل Caddy يعمل حتى لو أغلقت الـ Terminal',
    substeps: [
      {
        text: 'شغّل Caddy في الخلفية',
        code: 'nohup ./caddy reverse-proxy --from tarod.duckdns.org --to localhost:11280 > caddy.log 2>&1 &',
        note: 'nohup يُبقي البرنامج شغال حتى لو أغلقت Terminal',
      },
      {
        text: 'للتحقق أن Caddy شغال',
        code: 'ps aux | grep caddy',
      },
      {
        text: 'لإيقاف Caddy',
        code: 'pkill -f caddy',
      },
      {
        text: '💡 نصيحة: استخدم Startup Command من لوحة Wispbyte',
        note: 'اذهب لـ Server → Startup → Command واضغط الأمر هناك ليشتغل تلقائياً عند إعادة التشغيل',
      },
    ],
  },
];

// ─── مكون نسخ الكود ─────────────────────────────────────────────
function CodeBlock({ code, code2 }: { code: string; code2?: string }) {
  const [copied, setCopied] = useState(false);
  const [copied2, setCopied2] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="relative group">
        <pre
          dir="ltr"
          className="bg-slate-900 text-emerald-300 rounded-xl p-4 text-sm font-mono overflow-x-auto border border-slate-700 hover:border-slate-500 transition-colors"
        >
          <code>{code}</code>
        </pre>
        <button
          onClick={() => copy(code, setCopied)}
          className="absolute top-3 left-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          title="نسخ"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      {code2 && (
        <div className="relative group">
          <pre
            dir="ltr"
            className="bg-slate-900 text-emerald-300 rounded-xl p-4 text-sm font-mono overflow-x-auto border border-slate-700 hover:border-slate-500 transition-colors"
          >
            <code>{code2}</code>
          </pre>
          <button
            onClick={() => copy(code2, setCopied2)}
            className="absolute top-3 left-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="نسخ"
          >
            {copied2 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── مكون الخطوة ────────────────────────────────────────────────
function Step({ step, isOpen, onToggle }: { step: StepData; isOpen: boolean; onToggle: () => void }) {
  const Icon = step.icon;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-right hover:bg-slate-50 transition-colors"
      >
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400">الخطوة {step.id}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
        </div>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="space-y-4 pt-4">
            {step.substeps.map((sub, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm">{sub.text}</p>
                  {sub.note && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub.note}</p>
                  )}
                  {sub.code && <div className="mt-2"><CodeBlock code={sub.code} code2={sub.code2} /></div>}
                  {sub.isLink && sub.code && (
                    <a
                      href={sub.code}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      فتح الموقع
                    </a>
                  )}
                  {sub.result && (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 font-mono whitespace-pre-line" dir="ltr">
                      {sub.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── التطبيق الرئيسي ────────────────────────────────────────────
export default function App() {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));

  const toggleStep = (id: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSteps(new Set(steps.map((s) => s.id)));
  const collapseAll = () => setOpenSteps(new Set());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-emerald-400">دليل HTTPS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
            تفعيل HTTPS على خادم Wispbyte
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            باستخدام <span className="text-cyan-400 font-bold">DuckDNS</span> + <span className="text-emerald-400 font-bold">Caddy</span> —
            كاميرا الموقع ستعمل بعد تفعيل HTTPS 🎉
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <Globe className="w-5 h-5 text-cyan-400 mb-2" />
              <p className="text-sm font-bold">دومين مجاني</p>
              <p className="text-xs text-slate-400 mt-1">عبر DuckDNS.org</p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <Shield className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-sm font-bold">HTTPS تلقائي</p>
              <p className="text-xs text-slate-400 mt-1">عبر Caddy + Let's Encrypt</p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <Zap className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-sm font-bold">رابط ثابت</p>
              <p className="text-xs text-slate-400 mt-1">لا يتغير بعد الإعداد</p>
            </div>
          </div>
        </div>
      </header>

      {/* Warning */}
      <div className="max-w-3xl mx-auto px-4 -mt-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">لماذا نحتاج HTTPS؟</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              المتصفحات الحديثة تمنع الوصول للكاميرا على HTTP (ما عدا localhost).
              لتفعيل الكاميرا في موقعك على <code dir="ltr" className="bg-amber-100 px-1 rounded">http://78.154.103.30:11280</code>،
              يجب تشغيله عبر HTTPS.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">خطوات الإعداد</h2>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              فتح الكل
            </button>
            <button
              onClick={collapseAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              إغلاق الكل
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <Step
              key={step.id}
              step={step}
              isOpen={openSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="text-xl font-bold mb-3">🎯 الملخص السريع</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>أنشئ دومين مجاني على <strong>duckdns.org</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>اربطه بـ IP خادمك: <code dir="ltr" className="bg-white/20 px-1.5 py-0.5 rounded">78.154.103.30</code></span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>نزّل Caddy وشغّله كـ reverse proxy</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>افتح <code dir="ltr" className="bg-white/20 px-1.5 py-0.5 rounded">https://your-domain.duckdns.org</code> ← الكاميرا تعمل!</span>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">🔧 حل المشاكل الشائعة</h3>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-700 text-sm">Caddy يعطي خطأ "could not get certificate"</p>
              <p className="text-xs text-slate-500 mt-1">تأكد أن الدومين يشير لـ IP الصحيح في DuckDNS، وأن المنفذ 80 و 443 مفتوحان في Wispbyte.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">"Port 80/443 already in use"</p>
              <p className="text-xs text-slate-500 mt-1">
                شغّل <code dir="ltr" className="bg-slate-100 px-1 rounded">lsof -i :80</code> لمعرفة البرنامج المشغّل وأوقفه.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Caddy يتوقف عند إغلاق Terminal</p>
              <p className="text-xs text-slate-500 mt-1">
                استخدم <code dir="ltr" className="bg-slate-100 px-1 rounded">nohup</code> أو ضع الأمر في Startup Command من لوحة Wispbyte.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Wispbyte يُعيد تشغيل الـ Container</p>
              <p className="text-xs text-slate-500 mt-1">
                تأكد من وضع أمر Caddy في <strong>Startup Command</strong> من لوحة التحكم ليشتغل تلقائياً.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-6 text-sm">
        <p>دليل تفعيل HTTPS — خادم Wispbyte + DuckDNS + Caddy</p>
      </footer>
    </div>
  );
}
