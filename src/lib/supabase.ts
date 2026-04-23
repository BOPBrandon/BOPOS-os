import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const isMockMode =
  !supabaseUrl ||
  supabaseUrl.includes("your_supabase") ||
  !supabaseKey ||
  supabaseKey === "placeholder-key"

if (isMockMode) {
  console.warn("BOPOS: Running in mock mode — Supabase keys not configured. Use Developer Bypass on the sign-in page.")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClient: any = {
  auth: {
    getSession:          () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange:   (_e: unknown, _cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword:  () => Promise.resolve({ error: { message: "Mock mode — use Developer Bypass." } }),
    signUp:              () => Promise.resolve({ error: { message: "Mock mode — use Developer Bypass." } }),
  },
}

export const supabase = isMockMode
  ? mockClient
  : createClient(supabaseUrl, supabaseKey)

// ── Row type for bop_custom_tools ──────────────────────────────
export interface CustomTool {
  id:              string
  created_at:      string
  user_id:         string
  tool_name:       string
  code_content:    string
  target_location: "mpr" | "os" | "anchor"
}

// ── Row type for bop_tool_data ─────────────────────────────────
export interface ToolData {
  id:         string
  created_at: string
  updated_at: string
  user_id:    string
  tool_id:    string
  key:        string
  value:      unknown
}
