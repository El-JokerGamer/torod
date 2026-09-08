// ─── الباركود + المسح بالكاميرا (BarcodeDetector الأصلي) + صورة إثبات التسليم ─
import { useEffect, useRef, useState } from 'react';
import { ScanLine, Check, X, Camera } from 'lucide-react';
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
  // الموقع يجب أن يكون على HTTPS أو localhost
  const isSecure = window.isSecureContext;
  if (!isSecure) {
    return 'الكاميرا تتطلب اتصال آمن (HTTPS). تأكد من فتح الموقع عبر HTTPS وليس HTTP.';
  }
  // فحص وجود API الكاميرا
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'متصفحك لا يدعم الوصول إلى الكاميرا. جرّب متصفح آخر مثل Chrome أو Firefox.';
  }
  return null;
}

// ── الحصول على stream الكاميرا مع fallback ──
async function getCameraStream(): Promise<MediaStream> {
  // محاولة أولاً مع mediaDevices (الحديث)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } },
      audio: false,
    });
  }
  // fallback للـ API القديم (deprecated لكن قد يعمل)
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
      setCamError(preCheck);
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
          // تحديد سبب الخطأ بدقة
          const error = err as DOMException;
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setCamError('تم رفض إذن الكاميرا. اضغط على أيقونة القفل 🔒 في شريط العنوان واسمح بالكاميرا.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setCamError('لا توجد كاميرا متصلة بالجهاز.');
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            setCamError('الكاميرا مشغولة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.');
          } else if (error.name === 'OverconstrainedError') {
            // حاول بدون قيود
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 z-10 px-6 text-center">
              <Camera className="w-8 h-8 text-slate-500" />
              <span className="text-[11px] font-bold leading-5">{camError}</span>
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
      </div>
    </Modal>
  );
}

// ── صورة إثبات التسليم ──
export function PodCapture({ pod, onPod }: { pod: string | null; onPod: (p: string | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'idle' | 'cam'>('idle');
  const [err, setErr] = useState('');

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCam = async () => {
    setErr('');
    // فحص مسبق
    const preCheck = getCameraError();
    if (preCheck) {
      setErr(preCheck);
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
          {err && <p className="text-[11px] font-semibold text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}
