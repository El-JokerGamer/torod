// ─── طرود: الأنواع والثوابت والأدوات المشتركة ──────────────────────────────
export type Role = 'owner' | 'hr' | 'ops' | 'hub' | 'finance' | 'courier';

export interface User {
  id: string; name: string; username: string; password: string; role: Role;
  phone: string; hubIds: string[]; online: boolean; active: boolean; createdAt: number;
}

export const BASE_OWNER_ID = 'u-owner';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'المالك', hr: 'الموارد البشرية', ops: 'مشرف العمليات',
  hub: 'أمين الفرز', finance: 'محاسب COD', courier: 'مندوب',
};

export interface Hub { id: string; name: string; zoneId: string; address: string; phone: string }
export interface Route { id: string; name: string; code: string; zoneId: string | null; custom: boolean; courierIds: string[] }

export type OrderStatus =
  | 'created' | 'assigned' | 'handed' | 'on_way' | 'arrived'
  | 'delivered' | 'failed' | 'returned';

export type PaymentType = 'cod' | 'online';

export interface TimelineEvent { at: number; by: string; label: string; kind: 'ok' | 'info' | 'warn' | 'bad'; note?: string }

export interface Order {
  id: string; code: string; customer: string; phone: string; address: string;
  zoneId: string; hubId: string; cod: number; paymentType: PaymentType; status: OrderStatus;
  courierId?: string; recipientName?: string; failReason?: string; failNote?: string;
  settlementId?: string; pod?: string; timeline: TimelineEvent[];
  x: number; y: number; createdAt: number; updatedAt: number;
}

export const PAYMENT_TYPES: Record<PaymentType, { label: string; chip: string; icon: string }> = {
  cod: { label: 'نقدي (COD)', chip: 'bg-amber-50 text-amber-800 ring-amber-600/25', icon: '💵' },
  online: { label: 'أونلاين', chip: 'bg-sky-50 text-sky-700 ring-sky-600/25', icon: '💳' },
};

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'progress' | 'resolved' | 'closed';
export type IssueType = 'delay' | 'damage' | 'lost' | 'address' | 'customer' | 'courier' | 'other';

export interface IssueUpdate { at: number; by: string; byRole?: Role; note: string; status?: IssueStatus }
export interface Issue {
  id: string; title: string; type: IssueType; priority: Priority; status: IssueStatus;
  orderId?: string; courierId?: string; by: string; updates: IssueUpdate[]; createdAt: number;
}

export interface Settlement {
  id: string; courierId: string; orderIds: string[]; base: number; fees: number;
  adjustments: { label: string; amount: number }[]; net: number;
  status: 'pending' | 'settled'; settledAt?: number; by: string; createdAt: number;
}

export interface CourierPos { x: number; y: number; tx: number; ty: number; lastAt: number }

export interface DB {
  v: number; rev: number; updatedAt: number;
  users: User[]; hubs: Hub[]; routes: Route[]; orders: Order[];
  issues: Issue[]; settlements: Settlement[];
  seq: Record<string, number>; positions: Record<string, CourierPos>;
}

export const SEED_VERSION = 9;

// ── مناطق التغطية: القليوبية كاملة + القاهرة حتى مدينة نصر ──
export interface Zone { id: string; code: string; name: string; region: 'qalyubia' | 'cairo'; x: number; y: number }
export const ZONES: Zone[] = [
  { id: 'z-bnh', code: 'BNH', name: 'بنها',           region: 'qalyubia', x: 52, y: 8 },
  { id: 'z-kfs', code: 'KFS', name: 'كفر شكر',        region: 'qalyubia', x: 66, y: 6 },
  { id: 'z-tkh', code: 'TKH', name: 'طوخ',            region: 'qalyubia', x: 50, y: 15 },
  { id: 'z-qha', code: 'QHA', name: 'قها',            region: 'qalyubia', x: 44, y: 19 },
  { id: 'z-qls', code: 'QLY', name: 'قليوب',          region: 'qalyubia', x: 36, y: 23 },
  { id: 'z-shq', code: 'SHQ', name: 'شبين القناطر',   region: 'qalyubia', x: 64, y: 17 },
  { id: 'z-knk', code: 'KNK', name: 'الخانكة',        region: 'qalyubia', x: 72, y: 23 },
  { id: 'z-obr', code: 'OBR', name: 'العبور',         region: 'qalyubia', x: 69, y: 30 },
  { id: 'z-shk', code: 'SHK', name: 'شبرا الخيمة',    region: 'qalyubia', x: 40, y: 32 },
  { id: 'z-bht', code: 'BHT', name: 'بهتيم',          region: 'qalyubia', x: 45, y: 29 },
  { id: 'z-khs', code: 'KHS', name: 'الخصوص',         region: 'qalyubia', x: 49, y: 33 },
  { id: 'z-mtr', code: 'MTR', name: 'مسطرد',          region: 'cairo', x: 49, y: 38 },
  { id: 'z-mrg', code: 'MRG', name: 'المرج',          region: 'cairo', x: 60, y: 39 },
  { id: 'z-slm', code: 'SLM', name: 'السلام',         region: 'cairo', x: 65, y: 35 },
  { id: 'z-ain', code: 'AIN', name: 'عين شمس',        region: 'cairo', x: 54, y: 43 },
  { id: 'z-mat', code: 'MAT', name: 'المطرية',        region: 'cairo', x: 49, y: 45 },
  { id: 'z-nzh', code: 'NZH', name: 'النزهة',         region: 'cairo', x: 59, y: 45 },
  { id: 'z-hlp', code: 'HLP', name: 'مصر الجديدة',    region: 'cairo', x: 54, y: 49 },
  { id: 'z-ztn', code: 'ZTN', name: 'الزيتون',        region: 'cairo', x: 45, y: 47 },
  { id: 'z-hkb', code: 'HKB', name: 'حدائق القبة',    region: 'cairo', x: 40, y: 49 },
  { id: 'z-amr', code: 'AMR', name: 'الأميرية',       region: 'cairo', x: 38, y: 43 },
  { id: 'z-nsr', code: 'NSR', name: 'مدينة نصر',      region: 'cairo', x: 63, y: 51 },
];
export const zoneById = (id: string) => ZONES.find((z) => z.id === id);

// ── مراحل الطلب ──
export const STATUS_FLOW: OrderStatus[] = [
  'created', 'assigned', 'handed', 'on_way', 'arrived', 'delivered', 'failed', 'returned',
];
export const STATUS_META: Record<OrderStatus, { label: string; chip: string; dot: string; hex: string }> = {
  created:   { label: 'تم الإنشاء',      chip: 'bg-slate-100 text-slate-600 ring-slate-400/40',      dot: 'bg-slate-400',   hex: '#94a3b8' },
  assigned:  { label: 'مُسند لمندوب',    chip: 'bg-sky-50 text-sky-700 ring-sky-600/25',             dot: 'bg-sky-500',     hex: '#0ea5e9' },
  handed:    { label: 'مُسلَّم للمندوب', chip: 'bg-amber-50 text-amber-800 ring-amber-600/25',       dot: 'bg-amber-500',   hex: '#f59e0b' },
  on_way:    { label: 'في الطريق',       chip: 'bg-brand-50 text-brand-700 ring-brand-600/25',       dot: 'bg-brand-500',   hex: '#e8501e' },
  arrived:   { label: 'وصل للعميل',      chip: 'bg-orange-50 text-orange-700 ring-orange-600/25',    dot: 'bg-orange-500',  hex: '#f97316' },
  delivered: { label: 'تم التسليم',      chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/25', dot: 'bg-emerald-500', hex: '#10b981' },
  failed:    { label: 'فشل التسليم',     chip: 'bg-red-50 text-red-700 ring-red-600/25',             dot: 'bg-red-500',     hex: '#ef4444' },
  returned:  { label: 'مرتجع',           chip: 'bg-rose-50 text-rose-700 ring-rose-600/25',          dot: 'bg-rose-500',    hex: '#f43f5e' },
};

export const PRIORITIES: Record<Priority, { label: string; chip: string }> = {
  low:      { label: 'منخفضة', chip: 'bg-slate-100 text-slate-600 ring-slate-400/40' },
  medium:   { label: 'متوسطة', chip: 'bg-amber-50 text-amber-800 ring-amber-600/25' },
  high:     { label: 'عالية',  chip: 'bg-orange-50 text-orange-700 ring-orange-600/30' },
  critical: { label: 'حرجة',   chip: 'bg-red-50 text-red-700 ring-red-600/30' },
};
export const ISSUE_STATUSES: Record<IssueStatus, { label: string; chip: string }> = {
  open:     { label: 'مفتوحة',       chip: 'bg-red-50 text-red-700 ring-red-600/25' },
  progress: { label: 'قيد المعالجة', chip: 'bg-amber-50 text-amber-800 ring-amber-600/25' },
  resolved: { label: 'محلولة',       chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/25' },
  closed:   { label: 'مغلقة',        chip: 'bg-slate-100 text-slate-500 ring-slate-400/40' },
};
export const ISSUE_TYPES: Record<IssueType, string> = {
  delay: 'تأخير', damage: 'تلف', lost: 'فقدان', address: 'خطأ عنوان',
  customer: 'مشكلة عميل', courier: 'مشكلة مندوب', other: 'أخرى',
};
export const FAIL_REASONS = [
  'العميل لا يرد', 'العنوان خاطئ', 'العميل رفض الاستلام', 'تعذر الوصول للموقع', 'نقص المبلغ المطلوب', 'أخرى',
];

// ── أدوات عامة ──
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const money = (n: number) => `${n.toLocaleString('en-EG')} ج.م`;
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtFull = (t: number) => new Date(t).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const timeAgo = (t: number) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 10) return 'الآن';
  if (s < 60) return `منذ ${Math.floor(s)} ث`;
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return fmtDate(t);
};
export const avatarColor = (id: string) => {
  const palette = ['bg-brand-600', 'bg-petrol-500', 'bg-blue-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-emerald-600'];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return palette[h % palette.length];
};
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

// ── مولّد باركود Code39 حقيقي (قابل للقراءة بالكاميرا) ──
const C39: Record<string, string> = {
  '0': '111221211', '1': '211211112', '2': '112211112', '3': '212211111', '4': '111221112',
  '5': '211221111', '6': '112221111', '7': '111211212', '8': '211211211', '9': '112211211',
  'A': '211112112', 'B': '112112112', 'C': '212112111', 'D': '111122112', 'E': '211122111',
  'F': '112122111', 'G': '111112212', 'H': '211112211', 'I': '112112211', 'J': '111122211',
  'K': '211111122', 'L': '112111122', 'M': '212111121', 'N': '111121122', 'O': '211121121',
  'P': '112121121', 'Q': '111111222', 'R': '211111221', 'S': '112111221', 'T': '111121221',
  'U': '221111112', 'V': '122111112', 'W': '222111111', 'X': '121121112', 'Y': '221121111',
  'Z': '122121111', '-': '121111212', '.': '221111211', ' ': '122111211', '*': '121121211',
};
export function code39Bars(code: string): { x: number; w: number }[] {
  const src = `*${code.toUpperCase().replace(/[^0-9A-Z\-. ]/g, '')}*`;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let ci = 0; ci < src.length; ci++) {
    const pat = C39[src[ci]] ?? C39['-'];
    for (let i = 0; i < 9; i++) {
      const w = Number(pat[i]);
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    }
    x += 1;
  }
  return bars;
}

// ── تصدير Excel (CSV بترميز BOM يفتح مباشرة في Excel بالعربية) ──
export function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── الحالة الابتدائية النظيفة ──
export function initialState(): DB {
  const now = Date.now();
  return {
    v: SEED_VERSION, rev: 0, updatedAt: now,
    users: [{
      id: BASE_OWNER_ID, name: 'أحمد الشاذلي', username: 'owner', password: '1234',
      role: 'owner', phone: '01001234501', hubIds: [], online: false, active: true, createdAt: now,
    }],
    hubs: [],
    routes: ZONES.map((z) => ({ id: `r-${z.code}`, name: `مسار ${z.name}`, code: z.code, zoneId: z.id, custom: false, courierIds: [] })),
    orders: [], issues: [], settlements: [], seq: {}, positions: {},
  };
}
