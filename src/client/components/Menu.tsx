import type { CSSProperties } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { poolKey } from "../../core/pool";
import { categoryView, viewPath } from "../../core/routes";
import { useAnimationsDone } from "../hooks/useAnimationsDone";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useApp, useStore } from "../store";
import { currentTheme, toggleTheme } from "../theme";

function Menu({ out }: { out: boolean }) {
  const { store, book } = useApp();
  const { categories, personalSite } = book;
  const root = useRef<HTMLElement | null>(null);
  const active = useStore((state) =>
    state.view.kind === "collections" || state.view.kind === "about" ? state.view.kind : poolKey(state),
  );
  const [theme, setTheme] = useState("light");

  useLayoutEffect(() => setTheme(currentTheme()), []);
  useFocusTrap(root);
  useAnimationsDone(root, out, () => store.set({ menu: "closed" }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") store.set({ menu: "closing" });
    };
    if (out) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [out, store]);

  return (
    <nav
      ref={root}
      className="pb-menu"
      style={{ "--n": categories.length } as CSSProperties}
      data-out={out ? "" : undefined}
      aria-label="Categories"
    >
      {categories.map((c, i) => (
        <a
          key={c.key}
          className="pb-menu-item"
          href={viewPath(categoryView(c.key))}
          style={{ "--i": i } as CSSProperties}
          aria-current={active === c.key ? "true" : undefined}
        >
          <span>{c.label}</span>
          <span className="pb-menu-count">{c.countLabel}</span>
        </a>
      ))}

      <div className="pb-menu-foot" style={{ "--i": categories.length } as CSSProperties}>
        {personalSite && (
          <a className="pb-foot-link" href={personalSite.href} target="_blank" rel="noopener">
            {personalSite.label} &#8599;
          </a>
        )}
        <button type="button" className="pb-theme-btn" onClick={() => toggleTheme(store, setTheme)}>
          <span>{theme === "dark" ? "light mode" : "dark mode"}</span>
          <span className="pb-theme-dot" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export function MenuLayer() {
  const menu = useStore((state) => state.menu);
  return menu === "closed" ? null : <Menu out={menu === "closing"} />;
}
