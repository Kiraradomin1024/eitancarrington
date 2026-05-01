import type { Metadata } from "next";
import { Caveat, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eitan Carrington — Journal",
  description: "Journal personnel d'Eitan Carrington — Richman Lane, Los Santos.",
};

/* Inline script injected into <head> to apply the saved theme
   BEFORE the first paint, preventing flash of wrong theme (FOUC). */
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e){}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();

  let userEmail: string | null = null;
  let role: string | null = null;
  let displayName: string | null = null;

  if (configured) {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userEmail = user?.email ?? null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", user.id)
          .maybeSingle();
        role = data?.role ?? null;
        displayName = data?.display_name ?? null;
      }
    }
  }

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Nav userEmail={userEmail} role={role} displayName={displayName} />
          <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 fade-up">
            {configured ? children : <SetupNotice />}
          </main>
          <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
            <span className="font-hand text-base text-accent">Richman Lane</span>
            <span className="mx-2">·</span>
            journal tenu par les proches d&apos;Eitan
          </footer>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
