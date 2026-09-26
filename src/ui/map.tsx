// ─── خريطة التشغيل: غرفة تحكم حية (SVG) بمواقع المناطق والمخازن والمندوبين ──
import { useEffect, useState } from 'react';
import { ZONES, STATUS_META } from '../lib/data';
import type { DB, Order, User } from '../lib/data';
import { timeAgo } from '../lib/data';

const ROADS: string[] = [
  'M 40 32 L 45 29 L 49 33 L 54 43',
  'M 52 8 L 50 15 L 44 19 L 44 29',
  'M 52 8 L 66 6 M 50 15 L 64 17 L 72 23 L 69 30',
  'M 40 32 L 49 38 L 54 43 L 59 45 L 63 51',
  'M 49 45 L 54 49 L 63 51 M 45 47 L 40 49 M 38 43 L 45 47',
  'M 60 39 L 59 45 L 65 35 L 69 30',
  'M 36 23 L 40 32 M 36 23 L 38 43',
];

export function LiveMap({ db, orders, couriers, highlight, compact = false, className = '' }: {
  db: DB;
  orders: Order[];
  couriers: User[];
  highlight?: string;
  compact?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  void now;

  const onlineCouriers = couriers.filter((c) => c.online);
  const lastSignal = onlineCouriers.length
    ? Math.max(...onlineCouriers.map((c) => db.positions[c.id]?.lastAt ?? 0))
    : Date.now();
  const activeStatuses = Array.from(new Set(orders.map((o) => o.status)));

  return (
    <div className={`relative overflow-hidden rounded-lg ring-1 ring-ink/30 bg-ink bg-grid-dark shadow-inner ${compact ? '' : 'ops-map'} ${className}`} style={compact ? { aspectRatio: '4 / 3.4' } : undefined} dir="ltr">
      <svg viewBox="0 0 100 58" className="w-full h-full block" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#123048" />
            <stop offset="1" stopColor="#0e2233" />
          </linearGradient>
        </defs>

        {/* النيل */}
        <path d="M 26 -2 C 30 9, 25 19, 29 28 C 32 36, 27 46, 30 60 L 20 60 C 19 46, 23 36, 21 26 C 19 16, 22 7, 19 -2 Z" fill="url(#water)" opacity="0.8" />
        <text x="23.5" y="54" fontSize="1.9" fill="#3d617d" transform="rotate(-78 23.5 54)" fontFamily="inherit">النيل</text>

        {/* حد المحافظتين */}
        <line x1="31" y1="35" x2="78" y2="35" stroke="#2b4258" strokeWidth="0.22" strokeDasharray="1.4 1.1" />
        <text x="77" y="34.2" fontSize="1.7" fill="#587288" textAnchor="end">القليوبية</text>
        <text x="77" y="37" fontSize="1.7" fill="#587288" textAnchor="end">القاهرة</text>

        {/* طرق */}
        {ROADS.map((d, i) => (
          <path key={i} d={d} stroke="#2b4258" strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.9" />
        ))}
        <path d="M 33 36 C 42 32, 60 32, 68 37 C 73 44, 66 53, 55 54 C 44 54, 33 45, 33 36 Z" fill="none" stroke="#33506a" strokeWidth="0.36" strokeDasharray="2 1.2" opacity="0.8" />

        {/* المناطق */}
        {ZONES.map((z) => (
          <g key={z.id}>
            <circle cx={z.x} cy={z.y} r="0.8" fill="#41607c" />
            <text x={z.x} y={z.y + 2.9} fontSize="1.9" fill="#8ba3b8" textAnchor="middle" fontFamily="var(--font-body)">{z.name}</text>
          </g>
        ))}

        {/* المخازن */}
        {db.hubs.map((h) => {
          const z = ZONES.find((x) => x.id === h.zoneId);
          if (!z) return null;
          return (
            <g key={h.id} transform={`translate(${z.x - 4.4} ${z.y - 1})`}>
              <rect x="-1.1" y="-1.1" width="2.2" height="2.2" rx="0.42" fill="#3a1d0e" stroke="#e8501e" strokeWidth="0.28">
                <title>{`${h.name} — ${h.address}`}</title>
              </rect>
              <path d="M -0.6 0.1 L 0 0.1 M 0.2 -0.5 L 0.2 0.6 M -0.6 -0.5 L -0.6 0.6 M 0.6 -0.5 L 0.6 0.6" stroke="#f29b6c" strokeWidth="0.2" />
            </g>
          );
        })}

        {/* الطلبات النشطة */}
        {orders.map((o) => (
          <circle
            key={o.id}
            cx={o.x} cy={o.y} r={highlight === o.id ? 1.4 : 0.95}
            fill={STATUS_META[o.status].hex}
            stroke="#0c1622" strokeWidth="0.28"
            className={highlight === o.id ? 'animate-blink' : ''}
          >
            <title>{`${o.code} — ${o.customer} (${STATUS_META[o.status].label})`}</title>
          </circle>
        ))}

        {/* المندوبون */}
        {couriers.map((c) => {
          const p = db.positions[c.id];
          if (!p) return null;
          return (
            <g key={c.id} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 3s linear' }} opacity={c.online ? 1 : 0.35}>
              {c.online && (
                <circle r="1.5" fill="#f29b6c" className="animate-ping-soft" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              )}
              <circle r="1.2" fill={c.online ? '#e8501e' : '#57534e'} stroke="#fdf1ea" strokeWidth="0.32">
                <title>{`${c.name} — ${c.online ? `آخر إشارة ${timeAgo(p.lastAt)}` : 'غير متصل'}`}</title>
              </circle>
              <path d="M 0 -0.5 L 0.45 0.32 L -0.45 0.32 Z" fill="#fff" opacity="0.9" />
              <text y="-2" fontSize="1.8" fill="#f5e8dd" textAnchor="middle" fontWeight="700" fontFamily="var(--font-body)">{c.name.split(' ')[0]}</text>
            </g>
          );
        })}
      </svg>

      {/* شارة البث */}
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 bg-ink/85 ring-1 ring-white/15 rounded-full px-2.5 py-1" dir="rtl">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
        <span className="text-[10px] font-bold text-emerald-300">بث مباشر</span>
        <span className="text-[10px] text-slate-400 num" dir="ltr">{timeAgo(lastSignal)}</span>
      </div>
      <div className="absolute top-2.5 right-3 bg-ink/85 ring-1 ring-white/15 rounded-full px-2.5 py-1 text-[10px] text-slate-200 font-bold">
        {onlineCouriers.length} مندوب متصل
      </div>

      {/* مفتاح الخريطة */}
      <div className={`absolute bottom-2 inset-x-2 flex flex-wrap items-center gap-x-3 gap-y-1 bg-ink/85 ring-1 ring-white/15 rounded-md px-2.5 ${compact ? 'py-1' : 'py-1.5'}`} dir="rtl">
        {!compact && activeStatuses.map((s) => (
          <span key={s} className="flex items-center gap-1 text-[10px] text-slate-200 font-semibold">
            <span className="w-2 h-2 rounded-full ring-1 ring-white/40" style={{ background: STATUS_META[s].hex }} />
            {STATUS_META[s].label}
          </span>
        ))}
        {compact && activeStatuses.length === 0 && <span className="text-[10px] text-slate-400 font-semibold">لا طلبات نشطة</span>}
        <span className="flex items-center gap-1 text-[10px] text-slate-200 font-semibold ms-auto">
          <span className="w-2 h-2 rounded-full bg-brand-500 ring-1 ring-white/60" /> مندوب
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-200 font-semibold">
          <span className="w-2 h-2 rounded-[3px] border border-brand-500 bg-ink-3" /> مخزن
        </span>
      </div>
    </div>
  );
}
