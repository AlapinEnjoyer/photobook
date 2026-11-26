import type { View } from "../core/routes";
import { parsePath } from "../core/routes";

export function viewFromClick(e: MouseEvent): View | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;

  const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target || link.hasAttribute("download") || link.hash) return null;
  if (link.origin !== window.location.origin) return null;

  const view = parsePath(link.pathname);
  return view.kind === "unknown" ? null : view;
}
