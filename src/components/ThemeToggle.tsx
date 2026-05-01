"use client";

import { useTheme } from "./ThemeProvider";

/**
 * Animated sun ↔ moon toggle button for the navigation bar.
 * Renders a neutral placeholder during SSR to avoid hydration mismatch,
 * then reveals the correct icon after mount.
 */
export function ThemeToggle() {
  const { theme, mounted, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label={mounted ? (isDark ? "Passer en mode clair" : "Passer en mode sombre") : "Changer le thème"}
      title={mounted ? (isDark ? "Mode clair" : "Mode sombre") : "Thème"}
      className="relative w-9 h-9 rounded-full flex items-center justify-center
                 border border-border hover:border-accent/50
                 bg-surface hover:bg-accent-soft
                 transition-all duration-300 ease-out
                 hover:shadow-[0_0_12px_rgba(124,93,250,0.25)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Sun icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px] text-amber-500 absolute transition-all duration-300"
        style={
          mounted
            ? {
                opacity: isDark ? 0 : 1,
                transform: isDark ? "rotate(45deg) scale(0.5)" : "rotate(0deg) scale(1)",
              }
            : { opacity: 0 }
        }
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px] text-accent-2 absolute transition-all duration-300"
        style={
          mounted
            ? {
                opacity: isDark ? 1 : 0,
                transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-45deg) scale(0.5)",
              }
            : { opacity: 0 }
        }
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
