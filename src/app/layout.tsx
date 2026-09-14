import type { Metadata } from "next";
import { Caveat, Courier_Prime, Source_Serif_4, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NotebookHead, NotebookTabs, ThumbTabs } from "@/components/Nav";
import { SearchPalette } from "@/components/SearchPalette";
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

/* Caveat = ma main · Courier Prime = ce que je tape ·
   Source Serif = ce qui est imprimé · Oswald = ce qui est tamponné */
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/* Oswald sert aussi les tampons ; JetBrains Mono reste au mode intrusion */
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
  let hackingMode = false;
  let reloadNonce: string | null = null;

  if (configured) {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: { user } }, { data: settings }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("site_settings")
            .select("hacking_mode, reload_nonce")
            .eq("id", 1)
            .maybeSingle(),
        ]);
      hackingMode = Boolean(settings?.hacking_mode);
      reloadNonce = (settings?.reload_nonce as string | null) ?? null;
      userEmail = user?.email ?? null;
      userId = user?.id ?? null;
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
      className={`${caveat.variable} ${courier.variable} ${sourceSerif.variable} ${oswald.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <div className="notebook">
            <div className="notebook__spine" aria-hidden />
            <div className="notebook__holes" aria-hidden />
            <div className="notebook__margin" aria-hidden />
            <NotebookHead
              userId={userId}
              userEmail={userEmail}
              role={role}
              displayName={displayName}
            />
            <main className="notebook__page fade-up">
              {configured ? children : <SetupNotice />}
            </main>
            <NotebookTabs />
            <footer className="relative z-[3] pb-28 lg:pb-8 pl-9 sm:pl-11 lg:pl-[100px] pr-6 lg:pr-[76px] flex items-baseline gap-3 flex-wrap">
              <span className="hand text-[19px] text-ink-faint">Richman Lane</span>
              <span className="typed">journal tenu par les proches d&apos;Eitan</span>
            </footer>
          </div>
          <ThumbTabs />
          <SearchPalette
            userId={userId}
            isAdmin={role === "admin"}
            isLoggedIn={Boolean(userEmail)}
          />
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
