import type { Theme } from "../core/theme";
import { THEME_KEY } from "../core/theme";
import type { Store } from "./store";

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

function clearWashVars() {
  const root = document.documentElement;
  root.style.removeProperty("--paper-from");
  root.style.removeProperty("--wash-d");
  root.removeAttribute("data-fade");
}

export function settleTheme(store: Store) {
  clearWashVars();
  if (store.get().wash) store.set({ wash: false });
}

export function toggleTheme(store: Store, onChange: (theme: Theme) => void) {
  if (store.get().wash) return;

  const root = document.documentElement;
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.dataset.theme = next;
    clearWashVars();
    onChange(next);
    return;
  }

  root.style.setProperty("--paper-from", getComputedStyle(root).getPropertyValue("--paper"));
  root.style.setProperty("--wash-d", `${Math.hypot(window.innerWidth, window.innerHeight) + 8}px`);
  root.setAttribute("data-fade", "1");
  root.dataset.theme = next;

  onChange(next);
  store.set({ wash: true });
}
