import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Uses the publishable key, which is safe to expose
// as long as Row Level Security is enabled on every table.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
