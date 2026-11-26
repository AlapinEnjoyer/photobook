import { useEffect, useRef, useState } from "preact/hooks";
import { useApp, useStore } from "../store";

function useAutoHide() {
  const [hidden, setHidden] = useState(false);
  const view = useStore((state) => state.view);
  const lastY = useRef(0);

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;
  }, [view.kind, view.kind === "collection" ? view.key : ""]);

  useEffect(() => {
    // Scroll does not bubble; capture listens to the mounted .pb-grid scroller.
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.classList.contains("pb-grid")) return;

      const top = el.scrollTop;
      const delta = top - lastY.current;
      lastY.current = top;
      if (top < 40) setHidden(false);
      else if (delta > 0) setHidden(true);
      else if (delta < -2) setHidden(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (e.clientY < 90) setHidden(false);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("mousemove", onPointer);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("mousemove", onPointer);
    };
  }, []);

  return hidden;
}

export default function Bar() {
  const { store } = useApp();
  const hidden = useAutoHide();
  const menu = useStore((state) => state.menu);
  const open = menu !== "closed";

  const toggle = () => {
    if (menu === "open") store.set({ menu: "closing" });
    if (menu === "closed") store.set({ menu: "open" });
  };

  return (
    <div className="pb-bar" data-hidden={hidden && !open ? "" : undefined}>
      <button
        type="button"
        className="pb-bar-btn"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={toggle}
      >
        <span />
        <span />
      </button>
    </div>
  );
}
