"use client";

import { useTheme } from "./ThemeProvider";

/**
 * La lampe : le même cahier, le jour ou le soir.
 * Rend un libellé neutre au SSR pour éviter un décalage d'hydratation.
 */
export function ThemeToggle() {
  const { theme, mounted, toggle } = useTheme();
  const isDark = theme === "dark";
  const label = !mounted ? "la lampe" : isDark ? "rallumer le jour" : "passer au soir";

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={
        mounted
          ? isDark
            ? "Passer en mode clair"
            : "Passer en mode sombre"
          : "Changer le thème"
      }
      title={mounted ? (isDark ? "Mode clair" : "Mode sombre") : "Thème"}
      className="hand text-[19px] leading-none text-ink-soft hover:text-ink whitespace-nowrap shrink-0 min-h-[44px] lg:min-h-0 px-1"
    >
      <span aria-hidden className="mr-1.5 inline-block">
        {mounted && isDark ? "☼" : "☾"}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
