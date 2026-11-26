import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";

const FOCUSABLE = "button, [href], video[controls]";

function canFocus(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  return (
    !el.hasAttribute("disabled") &&
    el.tabIndex !== -1 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.pointerEvents !== "none" &&
    style.opacity !== "0"
  );
}

export function useFocusTrap(root: RefObject<HTMLElement | null>, initial?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    const items = () =>
      Array.from(root.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(canFocus);

    (initial?.current ?? items()[0])?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = items();
      const first = list[0];
      const last = list.at(-1);
      if (!first || !last) return;

      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTo?.focus?.();
    };
  }, [root, initial]);
}
