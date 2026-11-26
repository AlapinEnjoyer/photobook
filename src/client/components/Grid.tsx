import type { CSSProperties } from "preact";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { GRID_BATCH, gridLimitFor, poolKey } from "../../core/pool";
import { currentPool, openIndex, useApp, useStore } from "../store";
import Tile, { type Watch } from "./Tile";

const VIDEO_MARGIN = "300px";
const MORE_MARGIN = "900px";

function useClipWatcher(host: { current: HTMLElement | null }): Watch {
  const io = useRef<IntersectionObserver | null>(null);
  const callbacks = useRef(new Map<Element, () => void>());

  useEffect(
    () => () => {
      io.current?.disconnect();
      io.current = null;
    },
    [],
  );

  return useCallback(
    (el, onNear) => {
      if (typeof IntersectionObserver === "undefined") {
        onNear();
        return () => {};
      }

      io.current ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io.current?.unobserve(entry.target);
            callbacks.current.get(entry.target)?.();
            callbacks.current.delete(entry.target);
          }
        },
        { root: host.current, rootMargin: VIDEO_MARGIN },
      );

      callbacks.current.set(el, onNear);
      io.current.observe(el);
      return () => {
        callbacks.current.delete(el);
        io.current?.unobserve(el);
      };
    },
    [host],
  );
}

export default function Grid() {
  const { book } = useApp();
  const key = useStore(poolKey);
  const pool = useStore(currentPool);
  const needed = useStore((state) => gridLimitFor(openIndex(state)));

  const [limit, setLimit] = useState(needed);
  const host = useRef<HTMLElement | null>(null);
  const more = useRef<HTMLDivElement | null>(null);
  const watch = useClipWatcher(host);

  const shownKey = useRef(key);
  useLayoutEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    if (host.current) host.current.scrollTop = 0;
    setLimit(GRID_BATCH);
  }, [key]);

  useEffect(() => {
    setLimit((current) => Math.max(current, needed));
  }, [needed]);

  const visible = pool.slice(0, Math.max(limit, needed));
  const hasMore = visible.length < pool.length;

  useEffect(() => {
    const target = more.current;
    if (!hasMore || !target) return;

    const showMore = () => setLimit((current) => Math.min(pool.length, current + GRID_BATCH));
    if (typeof IntersectionObserver === "undefined") {
      showMore();
      return;
    }

    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && showMore(), {
      root: host.current,
      rootMargin: MORE_MARGIN,
    });
    io.observe(target);
    return () => io.disconnect();
  }, [hasMore, visible.length, pool.length]);

  const heading =
    key === "featured" ? "Featured" : (book.collections.find((c) => c.key === key)?.name ?? book.siteTitle);

  return (
    <main className="pb-grid" ref={host} style={{ "--row-h": `${book.rowHeight}px` } as CSSProperties}>
      <h1 className="sr-only">{heading}</h1>
      {visible.map((photo, i) => (
        <Tile key={photo.id} photo={photo} index={i} watch={watch} />
      ))}
      {hasMore && <div className="pb-grid-more" ref={more} aria-hidden="true" />}
    </main>
  );
}
