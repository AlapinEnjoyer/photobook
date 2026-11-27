import { useEffect, useRef, useState } from "preact/hooks";
import { collectionPath } from "../../core/routes";
import { useApp, useStore } from "../store";

// Outlasts the 820ms wipe to absorb trackpad momentum.
const SETTLE_MS = 900;
const WHEEL_MIN = 14;
const SWIPE_MIN = 40;

export default function Collections() {
  const { store, book } = useApp();
  const { collections } = book;
  const washing = useStore((state) => state.wash);
  const paused = useStore((state) => state.menu !== "closed");

  const [col, setCol] = useState(() =>
    Math.max(
      0,
      collections.findIndex((c) => c.key === store.get().lastCollection),
    ),
  );
  const [prev, setPrev] = useState<number | null>(null);

  const busy = useRef(false);
  const touch = useRef({ x: 0, y: 0 });
  const suppressOpenUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const n = collections.length;

  const goTo = (i: number) => {
    if (!n) return;
    const next = ((i % n) + n) % n;
    if (busy.current || next === col) return;

    busy.current = true;
    setPrev(col);
    setCol(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      busy.current = false;
      setPrev(null);
    }, SETTLE_MS);
  };

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goTo(col + 1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goTo(col - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [col, paused]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onWheel = (e: WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (busy.current || Math.abs(delta) < WHEEL_MIN) return;
    goTo(col + (delta > 0 ? 1 : -1));
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = touch.current.x - t.clientX;
    const dy = touch.current.y - t.clientY;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;

    e.preventDefault();
    suppressOpenUntil.current = Date.now() + 500;
    goTo(col + (dx > 0 ? 1 : -1));
  };

  const guard = (e: { preventDefault(): void }) => {
    if (Date.now() < suppressOpenUntil.current) e.preventDefault();
  };

  const inCoverWindow = (i: number) =>
    i === col || i === prev || (n > 1 && (i === (col + 1) % n || i === (col - 1 + n) % n));

  const railSide = col % 2 === 0 ? "right" : "left";

  return (
    <main
      className={`pb-cols pb-cols--rail-${railSide}`}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <h1 className="sr-only">Collections</h1>
      {collections.map((c, i) => {
        const isCur = i === col;
        const side = i % 2 === 0 ? "left" : "right";

        return (
          <section
            key={c.key}
            className={`pb-col-panel pb-col-panel--${side}`}
            data-current={isCur ? "" : undefined}
            data-prev={i === prev ? "" : undefined}
            aria-hidden={!isCur}
            inert={!isCur}
          >
            {washing && (isCur || i === prev) && <div className="pb-wash" aria-hidden="true" />}

            <a
              className="pb-col-img"
              href={collectionPath(c.key)}
              aria-label={`Open ${c.name}`}
              draggable={false}
              onClick={guard}
            >
              {c.cover && inCoverWindow(i) && (
                <img
                  className="pb-col-img-el"
                  src={c.cover.src}
                  srcSet={c.cover.srcSet}
                  sizes={c.cover.sizes}
                  alt=""
                  fetchPriority={isCur ? "high" : "low"}
                  decoding="async"
                  draggable={false}
                />
              )}
            </a>

            <div className="pb-col-type">
              <a className="pb-col-title" href={collectionPath(c.key)} draggable={false} onClick={guard}>
                {c.name}
              </a>
              <div className="pb-col-meta">
                <span>{c.year}</span>
                <span>{c.countLabel}</span>
              </div>
            </div>
          </section>
        );
      })}

      {n > 0 && (
        <div className="pb-rail">
          {collections.map((c, i) => (
            <button
              key={c.key}
              type="button"
              className="pb-tick"
              aria-label={`Go to ${c.name}`}
              aria-current={i === col ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
          <div className="pb-counter">
            {String(col + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </div>
        </div>
      )}
    </main>
  );
}
