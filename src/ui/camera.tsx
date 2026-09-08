// ─── الباركود + المسح بالكاميرا (BarcodeDetector الأصلي) + صورة إثبات التسليم ─
import { useEffect, useRef, useState } from 'react';
import { ScanLine, Check, X, Camera, ShieldAlert, Keyboard, AlertTriangle } from 'lucide-react';
import { code39Bars } from '../lib/data';
import { Modal, Btn } from './kit';

// ── باركود Code39 حقيقي قابل للقراءة ──
export function Barcode({ code, className = 'h-14' }: { code: string; className?: string }) {
  const bars = code39Bars(code);
  const W = bars.length ? bars[bars.length - 1].x + bars[bars.length - 1].w + 1 : 10;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${W} 24`} className={`w-full ${className}`} preserveAspectRatio="none">
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y="0" width={b.w} height="20" fill="#0c1622" />
        ))}
      </svg>
      <span className="num text-xs font-bold tracking-[0.25em] text-slate-500" dir="ltr">{code}</span>
    </div>
  );
}

// ── فحص توفر الكاميرا (تتطلب HTTPS / Secure Context) ──
function getCameraError(): string | null {
  const isSecure = window.isSecureContext;
  if (!isSecure) {
    return 'HTTPS_REQUIRED';
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'متصفحك لا يدعم الوصول إلى الكاميرا. جرّب متصفح Chrome أو Firefox.';
  }
  return null;
}

// ── الحصول على stream الكاميرا مع fallback ──
async function getCameraStream(): Promise<MediaStream> {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } },
      audio: false,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyGetUserMedia = (navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;
  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(
        navigator,
        { video: { facingMode: 'environment' }, audio: false },
        (stream: MediaStream) => resolve(stream),
        (err: Error) => reject(err)
      );
    });
  }
  throw new Error('Camera API not available');
}

// ── نافذة إرشاد HTTPS ──
function HttpsGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="تفعيل الكاميرا" w="max-w-md"
      icon={<ShieldAlert className="w-5 h-5" />} desc="الكاميرا تتطلب اتصال آمن (HTTPS)">
      <div className="space-y-4 text-right">
        {/* تنبيه */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-5">
            <strong>الموقع يعمل على HTTP</strong> — المتصفح يمنع الكاميرا لأسباب أمنية.
            <br />
            الرابط الحالي: <code className="bg-amber-100 px-1 rounded text-[10px]" dir="ltr">{window.location.origin}</code>
          </div>
        </div>

        {/* الحل 1: للمطور */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
            الحل الدائم (للمسؤول)
          </h4>
          <p className="text-[11px] text-slate-600 leading-5">
            فعّل شهادة SSL (HTTPS) على الخادم. يمكن استخدام:
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1 pr-4 list-disc">
            <li><strong>Nginx</strong> كـ reverse proxy مع شهادة Let's Encrypt (مجاني)</li>
            <li>أو شهادة ذاتية (self-signed) للاستخدام الداخلي</li>
            <li>أو ربط <strong>اسم نطاق (Domain)</strong> بدل IP لتفعيل SSL تلقائياً</li>
          </ul>
        </div>

        {/* الحل 2: للمستخدم - Chrome Flag */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">2</span>
            حل مؤقت (على جهازك فقط)
          </h4>
          <p className="text-[11px] text-slate-600 leading-5">
            في متصفح Chrome، افتح الرابط التالي:
          </p>
          <code className="block bg-slate-800 text-emerald-400 text-[10px] p-2 rounded font-mono text-center" dir="ltr">
            chrome://flags/#unsafely-treat-insecure-origin-as-secure
          </code>
          <p className="text-[11px] text-slate-600 leading-5">
            ثم أضف رابط الموقع:
          </p>
          <code className="block bg-slate-800 text-emerald-400 text-[10px] p-2 rounded font-mono text-center" dir="ltr">
            {window.location.origin}
          </code>
          <p className="text-[11px] text-slate-600 leading-5">
            فعّل الخيار وأعد تشغيل المتصفح.
          </p>
        </div>

        {/* الحل 3: Android */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">3</span>
            على الهاتف (Android)
          </h4>
          <p className="text-[11px] text-slate-600 leading-5">
            افتح <code className="bg-slate-200 px-1 rounded text-[10px]" dir="ltr">chrome://flags</code> في Chrome
            <br />
            ابحث عن <strong>"Insecure origins treated as secure"</strong>
            <br />
            أضف رابط الموقع وفعّل الخيار ثم أعد التشغيل.
          </p>
        </div>

        <Btn v="dark" onClick={onClose} className="w-full">فهمت، سأحل المشكلة</Btn>
      </div>
    </Modal>
  );
}

// ── نافذة إدخال يدوي للباركود ──
function ManualEntryModal({ open, onClose, expected, onDone, title }: {
  open: boolean;
  onClose: () => void;
  expected: string[];
  onDone: (code: string) => void;
  title: string;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    const code = value.trim().toUpperCase();
    if (!code) {
      setError('أدخل رقم الشحنة');
      return;
    }
    if (expected.length > 0 && !expected.includes(code)) {
      setError('الكود لا يطابق الشحنة المطلوبة');
      return;
    }
    onDone(code);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} w="max-w-sm"
      icon={<Keyboard className="w-5 h-5" />} desc="أدخل رقم الشحنة يدوياً">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="رقم الشحنة / الباركود"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          dir="ltr"
          autoComplete="off"
        />
        {error && <p className="text-[11px] text-red-600 font-semibold text-center">{error}</p>}
        <div className="flex gap-2">
          <Btn v="success" onClick={handleSubmit} className="flex-1">تأكيد</Btn>
          <Btn v="ghost" onClick={onClose}>إلغاء</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── مسح بالكاميرا عبر BarcodeDetector — بدون إدخال يدوي ──
export function CameraScanModal({ open, onClose, expected, title, verb, onDone }: {
  open: boolean;
  onClose: () => void;
  expected: string | string[];
  title: string;
  verb: string;
  onDone: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'starting' | 'live' | 'mismatch' | 'success' | 'nocam'>('starting');
  const [camError, setCamError] = useState<string>('الكاميرا غير متاحة أو غير مدعومة في هذا المتصفح');
  const [showHttpsGuide, setShowHttpsGuide] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const doneRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const expectedList = (Array.isArray(expected) ? expected : [expected]).map((c) => c.toUpperCase());
  const onDoneRef = useRef(onDone);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onDoneRef.current = onDone; onCloseRef.current = onClose; });

  const finish = (code: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('success');
    setTimeout(() => { onDoneRef.current(code); onCloseRef.current(); }, 700);
  };

  useEffect(() => {
    if (!open) return;
    doneRef.current = false;
    setPhase('starting');

    // فحص مسبق لتوفر الكاميرا
    const preCheck = getCameraError();
    if (preCheck) {
      if (preCheck === 'HTTPS_REQUIRED') {
        setCamError('الكاميرا تتطلب اتصال آمن (HTTPS). الموقع يعمل حالياً على HTTP.');
        setShowHttpsGuide(true);
      } else {
        setCamError(preCheck);
      }
      setPhase('nocam');
      return;
    }

    const detector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (window as any).BarcodeDetector !== 'undefined' ? new (window as any).BarcodeDetector({ formats: ['code_39', 'code_128', 'qr_code', 'ean_13'] }) : null;

    let cancelled = false;
    (async () => {
      try {
        const stream = await getCameraStream();
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => { /* autoplay */ });
        }
        setPhase('live');

        const loop = async () => {
          if (cancelled || doneRef.current) return;
          const v = videoRef.current;
          if (v && detector && v.readyState >= 2) {
            try {
              const codes = await detector.detect(v);
              const hit = codes.find((c) => expectedList.includes((c.rawValue || '').trim().toUpperCase()));
              if (hit) { finish(hit.rawValue.trim()); return; }
              if (codes.length) {
                setPhase('mismatch');
                setTimeout(() => setPhase((p) => (p === 'mismatch' ? 'live' : p)), 700);
              }
            } catch { /* إطار غير قابل للقراءة */ }
          }
          rafRef.current = requestAnimationFrame(() => void loop());
        };
        void loop();
      } catch (err) {
        if (!cancelled) {
          const error = err as DOMException;
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setCamError('تم رفض إذن الكاميرا. اضغط على أيقونة القفل 🔒 في شريط العنوان واسمح بالكاميرا.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setCamError('لا توجد كاميرا متصلة بالجهاز.');
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            setCamError('الكاميرا مشغولة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.');
          } else if (error.name === 'OverconstrainedError') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
              streamRef.current = stream;
              const video = videoRef.current;
              if (video) {
                video.srcObject = stream;
                await video.play().catch(() => {});
              }
              setPhase('live');
              const loop = async () => {
                if (cancelled || doneRef.current) return;
                const v = videoRef.current;
                if (v && detector && v.readyState >= 2) {
                  try {
                    const codes = await detector.detect(v);
                    const hit = codes.find((c) => expectedList.includes((c.rawValue || '').trim().toUpperCase()));
                    if (hit) { finish(hit.rawValue.trim()); return; }
                    if (codes.length) {
                      setPhase('mismatch');
                      setTimeout(() => setPhase((p) => (p === 'mismatch' ? 'live' : p)), 700);
                    }
                  } catch { /* */ }
                }
                rafRef.current = requestAnimationFrame(() => void loop());
              };
              void loop();
              return;
            } catch {
              setCamError('تعذّر تشغيل الكاميرا. تأكد من الصلاحيات والمعدات.');
            }
          } else {
            setCamError(`تعذّر الوصول للكاميرا: ${error.message || 'خطأ غير معروف'}`);
          }
          setPhase('nocam');
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expectedList.join(',')]);

  return (
    <>
      <Modal open={open} onClose={() => { if (phase !== 'success') onClose(); }} title={title} w="max-w-md"
        icon={<ScanLine className="w-5 h-5" />} desc="وجّه الكاميرا نحو ملصق الباركود — تتم القراءة تلقائيًا">
        <div className="flex flex-col items-center">
          <div className={`relative w-full max-w-72 aspect-[4/3] rounded-lg overflow-hidden bg-ink bg-grid-dark ring-2 transition-colors ${
            phase === 'success' ? 'ring-emerald-500' : phase === 'mismatch' ? 'ring-red-500 animate-shake' : 'ring-ink-4'
          }`}>
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

            {/* زوايا الإطار */}
            {['top-2 right-2 border-t-2 border-r-2', 'top-2 left-2 border-t-2 border-l-2', 'bottom-2 right-2 border-b-2 border-r-2', 'bottom-2 left-2 border-b-2 border-l-2'].map((c) => (
              <span key={c} className={`absolute w-6 h-6 rounded-sm z-10 ${c} ${phase === 'success' ? 'border-emerald-400' : 'border-brand-400'}`} />
            ))}

            {phase === 'live' && (
              <div className="absolute inset-x-4 h-0.5 bg-emerald-400 shadow-[0_0_14px_2px_rgba(52,211,153,0.8)] animate-scanline z-10" />
            )}
            {phase === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 z-10">
                <span className="w-7 h-7 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                <span className="text-[11px] font-bold">جارٍ تشغيل الكاميرا…</span>
              </div>
            )}
            {phase === 'nocam' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10 px-6 text-center">
                <Camera className="w-8 h-8 text-slate-500" />
                <span className="text-[11px] font-bold leading-5">{camError}</span>
                {!window.isSecureContext && (
                  <button
                    onClick={() => setShowHttpsGuide(true)}
                    className="text-[10px] font-bold text-brand-400 underline underline-offset-2 hover:text-brand-300"
                  >
                    عرض خطوات الحل ←
                  </button>
                )}
              </div>
            )}
            {phase === 'mismatch' && (
              <div className="absolute inset-0 bg-red-500/15 flex items-center justify-center z-10">
                <span className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/40">
                  <X className="w-6 h-6" strokeWidth={2.6} />
                </span>
              </div>
            )}
            {phase === 'success' && (
              <div className="absolute inset-0 bg-emerald-500/15 flex items-center justify-center z-10">
                <span className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-pop shadow-xl shadow-emerald-500/40">
                  <Check className="w-7 h-7" strokeWidth={2.6} />
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            {phase === 'success' ? 'تمت القراءة بنجاح' : phase === 'mismatch' ? 'الكود المقروء لا يطابق الشحنة' : `${verb} — القراءة عبر الكاميرا مباشرة`}
          </p>

          {/* زر الإدخال اليدوي كبديل */}
          {phase === 'nocam' && (
            <button
              onClick={() => setShowManualEntry(true)}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-brand-500 hover:text-brand-400 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              أو أدخل الكود يدوياً
            </button>
          )}
        </div>
      </Modal>

      {/* نافذة إرشاد HTTPS */}
      <HttpsGuideModal open={showHttpsGuide} onClose={() => setShowHttpsGuide(false)} />

      {/* نافذة الإدخال اليدوي */}
      <ManualEntryModal
        open={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        expected={expectedList}
        onDone={(code) => { onDone(code); onClose(); }}
        title={title}
      />
    </>
  );
}

// ── صورة إثبات التسليم ──
export function PodCapture({ pod, onPod }: { pod: string | null; onPod: (p: string | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'idle' | 'cam'>('idle');
  const [err, setErr] = useState('');
  const [showHttpsGuide, setShowHttpsGuide] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCam = async () => {
    setErr('');
    // فحص مسبق
    const preCheck = getCameraError();
    if (preCheck) {
      if (preCheck === 'HTTPS_REQUIRED') {
        setErr('الكاميرا تتطلب اتصال آمن (HTTPS). الموقع يعمل على HTTP.');
        setShowHttpsGuide(true);
      } else {
        setErr(preCheck);
      }
      return;
    }
    try {
      const stream = await getCameraStream();
      streamRef.current = stream;
      setMode('cam');
      setTimeout(async () => {
        const v = videoRef.current;
        if (v && streamRef.current) { v.srcObject = streamRef.current; await v.play().catch(() => {}); }
      }, 60);
    } catch (err) {
      const error = err as DOMException;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErr('تم رفض إذن الكاميرا. اضغط على أيقونة القفل 🔒 في شريط العنوان واسمح بالكاميرا.');
      } else if (error.name === 'NotFoundError') {
        setErr('لا توجد كاميرا متصلة بالجهاز.');
      } else if (error.name === 'NotReadableError') {
        setErr('الكاميرا مشغولة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.');
      } else {
        setErr(`تعذّر فتح الكاميرا: ${error.message || 'تأكد من السماح بالوصول إليها'}`);
      }
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 900 / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth * scale;
    canvas.height = v.videoHeight * scale;
    canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.72);
    stopStream();
    setMode('idle');
    onPod(url);
  };

  const cancelCam = () => { stopStream(); setMode('idle'); };

  useEffect(() => () => stopStream(), []);

  if (pod) {
    return (
      <div className="space-y-2">
        <img src={pod} alt="إثبات التسليم" className="w-full max-w-72 mx-auto rounded-lg ring-1 ring-slate-300 shadow-sm" />
        <div className="flex justify-center gap-2">
          <Btn sm v="ghost" onClick={() => onPod(null)}>إعادة الالتقاط</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mode === 'cam' ? (
        <div className="space-y-2">
          <video ref={videoRef} playsInline muted className="w-full max-w-72 mx-auto rounded-lg aspect-[4/3] object-cover bg-ink" />
          <div className="flex justify-center gap-2">
            <Btn sm v="success" icon={<Camera className="w-4 h-4" />} onClick={capture}>التقاط الصورة</Btn>
            <Btn sm v="ghost" onClick={cancelCam}>إلغاء</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-3">
          <Btn v="dark" icon={<Camera className="w-4 h-4" />} onClick={openCam}>فتح الكاميرا لالتقاط صورة الإثبات</Btn>
          {err && (
            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold text-red-600">{err}</p>
              {!window.isSecureContext && (
                <button
                  onClick={() => setShowHttpsGuide(true)}
                  className="text-[10px] font-bold text-brand-500 underline underline-offset-2 hover:text-brand-400"
                >
                  عرض خطوات الحل ←
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* نافذة إرشاد HTTPS */}
      <HttpsGuideModal open={showHttpsGuide} onClose={() => setShowHttpsGuide(false)} />
    </div>
  );
}
