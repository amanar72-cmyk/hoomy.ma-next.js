import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

// Lit le thème actuel depuis l'attribut data-theme de <html>
function lireTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") ?? "light") as Theme;
}

// Hook réactif — se synchronise automatiquement avec les changements de data-theme
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(lireTheme);

  useEffect(() => {
    setTheme(lireTheme());
    const observer = new MutationObserver(() => setTheme(lireTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
