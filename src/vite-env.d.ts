/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** رابط مشروع Supabase — يُضبط من ملف .env */
  readonly VITE_SUPABASE_URL?: string;
  /** مفتاح anon العام لـ Supabase — يُضبط من ملف .env */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
