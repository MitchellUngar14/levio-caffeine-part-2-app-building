import type { ThemeSetting } from "@caffeine/core";
import { useEffect, useState } from "react";

/** Applies the theme setting to <html data-theme> and reports which mode is showing. */
export function useTheme(theme: ThemeSetting): "light" | "dark" {
  const [system, setSystem] = useState<"light" | "dark">(() => (matchDark() ? "dark" : "light"));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  return theme === "system" ? system : theme;
}

function matchDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
