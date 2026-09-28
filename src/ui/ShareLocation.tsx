import { useEffect, useState } from 'react';
import { MapPin, Navigation, Share2, X, Copy, Check } from 'lucide-react';
import { useMe } from '../lib/store';
import { Btn } from './kit';

interface Location {
  lat: number;
  lng: number;
  accuracy: number;
}

export function ShareLocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open || !me) return;

    setLoading(true);
    setError(null);

    // طلب الموقع الحالي
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        let errorMsg = 'تعذر تحديد الموقع';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'يرجى السماح بتحديد الموقع من إعدادات المتصفح';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'معلومات الموقع غير متاحة';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'انتهت مهلة طلب الموقع';
        }
        setError(errorMsg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [open, me]);

  const shareLocation = async () => {
    if (!location) return;

    const shareUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    // محاولة استخدام Web Share API
    if (navigator.share) {
      try {
        setSharing(true);
        await navigator.share({
          title: 'موقعي الحالي - طرود',
          text: `موقعي الحالي: ${shareUrl}`,
          url: shareUrl,
        });
        setSharing(false);
      } catch (err) {
        setSharing(false);
        // إذا فشل، انسخ الرابط
        copyToClipboard(shareUrl);
      }
    } else {
      // إذا لم يكن Web Share API متاح، انسخ الرابط
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('فشل النسخ:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  if (!open) return null;

  const mapUrl = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=18` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-6 h-6" />
              <h2 className="text-xl font-bold">مشاركة الموقع</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/90">شارك موقعك الحالي مع الآخرين</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-600">جارٍ تحديد موقعك...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-semibold">{error}</p>
              <p className="text-xs text-red-600 mt-1">تأكد من السماح بتحديد الموقع في إعدادات المتصفح</p>
            </div>
          )}

          {location && !loading && (
            <>
              {/* Map Preview */}
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="موقعي على الخريطة"
                />
              </div>

              {/* Location Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-slate-700">إحداثيات الموقع:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded p-2">
                    <div className="text-slate-500">خط العرض</div>
                    <div className="font-mono font-bold text-slate-800">{location.lat.toFixed(6)}</div>
                  </div>
                  <div className="bg-white rounded p-2">
                    <div className="text-slate-500">خط الطول</div>
                    <div className="font-mono font-bold text-slate-800">{location.lng.toFixed(6)}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  دقة الموقع: ±{Math.round(location.accuracy)} متر
                </div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-2">
                <Btn
                  className="w-full"
                  icon={<Share2 className="w-4 h-4" />}
                  onClick={shareLocation}
                  disabled={sharing}
                >
                  {sharing ? 'جارٍ المشاركة...' : 'مشاركة الموقع'}
                </Btn>
                <Btn
                  v="ghost"
                  className="w-full"
                  icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  onClick={() => copyToClipboard(mapUrl)}
                >
                  {copied ? 'تم النسخ!' : 'نسخ رابط الموقع'}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
