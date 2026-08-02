import type { Metadata } from "next";
import { Caveat, Fraunces, Inter, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ImageLightbox } from "@/components/ImageLightbox";
import { HackingMode } from "@/components/HackingMode";
import { isKirara } from "@/lib/hacking";
import { PrivateChat } from "@/components/PrivateChat";
import { chatAlias } from "@/lib/chat";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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

/* Utilisées par le mode intrusion SC292 */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eitan Carrington — Journal",
    template: "%s — Journal d'Eitan",
  },
  description:
    "Dossier RP d'Eitan Carrington : wiki des proches, journal de sessions, mindmap des relations, enquêtes. Richman Lane, Los Santos.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fr_FR",
    title: "Eitan Carrington — Journal",
    description:
      "Dossier RP d'Eitan Carrington : wiki des proches, journal de sessions, mindmap des relations, enquêtes.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Eitan Carrington — Journal",
    description:
      "Dossier RP d'Eitan Carrington : wiki, journal, mindmap, enquêtes.",
  },
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

  let userId: string | null = null;
  let userEmail: string | null = null;
  let role: string | null = null;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let eitanPhotoUrl: string | null = null;
  let hackingMode = false;
  let reloadNonce: string | null = null;

  if (configured) {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: { user } }, { data: mainChar }, { data: settings }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("character")
            .select("photo_url")
            .eq("is_main", true)
            .maybeSingle(),
          supabase
            .from("site_settings")
            .select("hacking_mode, reload_nonce")
            .eq("id", 1)
            .maybeSingle(),
        ]);
      eitanPhotoUrl = (mainChar?.photo_url as string | null) ?? null;
      hackingMode = Boolean(settings?.hacking_mode);
      reloadNonce = (settings?.reload_nonce as string | null) ?? null;
      userEmail = user?.email ?? null;
      userId = user?.id ?? null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        role = data?.role ?? null;
        displayName = data?.display_name ?? null;
        avatarUrl = (data?.avatar_url as string | null) ?? null;
      }
    }
  }

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable} ${oswald.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Nav
            userId={userId}
            userEmail={userEmail}
            role={role}
            displayName={displayName}
            avatarUrl={avatarUrl}
            eitanPhotoUrl={eitanPhotoUrl}
          />
          <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 fade-up">
            {configured ? children : <SetupNotice />}
          </main>
          <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
            <span className="font-hand text-base text-accent">Richman Lane</span>
            <span className="mx-2">·</span>
            journal tenu par les proches d&apos;Eitan
          </footer>
          <ImageLightbox />
          <HackingMode
            initialOn={hackingMode}
            canToggle={isKirara(role, displayName)}
            initialReloadNonce={reloadNonce}
          />
          {userId && chatAlias(displayName) && (
            <PrivateChat
              myUserId={userId}
              myAlias={chatAlias(displayName)!}
              initialHackOn={hackingMode}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
