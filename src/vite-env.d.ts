/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: enables thumbnail grid via YouTube Data API v3 (free quota). */
  readonly VITE_YOUTUBE_API_KEY?: string;
  /** Override default channel id from `src/config/youtube.ts` if needed. */
  readonly VITE_YOUTUBE_CHANNEL_ID?: string;
  /** Supabase project URL (Contact form → Edge Function). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key (safe in frontend with RLS). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Web3Forms access key — alternative to Supabase; emails go to the address you set on web3forms.com */
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
}
