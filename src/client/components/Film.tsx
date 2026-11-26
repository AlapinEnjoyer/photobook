import type { CSSProperties } from "preact";
import { useEffect, useMemo, useRef } from "preact/hooks";
import { photoPath } from "../../core/routes";
import type { Photo } from "../../core/types";

const GLIDE_MS = 320;

interface Props {
  pool: Photo[];
  index: number;
  full: boolean;
}

export default function Film({ pool, index, full }: Props) {
  const film = useRef<HTMLDivElement | null>(null);
  const initial = useRef(index);
  const shown = useRef<number | null>(null);

  const items = useMemo(
    () =>
      pool.map((photo, i) => (
        <a
          key={photo.id}
          className="pb-film-item"
          href={photoPath(photo.id)}
          style={{ "--aspect": photo.width / photo.height } as CSSProperties}
          aria-label={photo.title}
          aria-current={i === initial.current ? "true" : undefined}
          tabIndex={full ? -1 : undefined}
          draggable={false}
        >
          <img className="pb-film-img" src={photo.thumb} alt="" loading="lazy" draggable={false} />
        </a>
      )),
    [pool, full],
  );

  useEffect(() => {
    const strip = film.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;

    for (const el of strip.querySelectorAll('[aria-current="true"]')) el.removeAttribute("aria-current");
    thumb.setAttribute("aria-current", "true");

    const first = shown.current == null;
    if (shown.current === index) return;
    shown.current = index;

    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const target = Math.max(
      0,
      Math.min(max, thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2),
    );

    if (first || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      strip.scrollLeft = target;
      return;
    }

    const from = strip.scrollLeft;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / GLIDE_MS);
      strip.scrollLeft = from + (target - from) * (1 - (1 - p) ** 3);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [index, items]);

  return (
    <div className="pb-film" ref={film}>
      {items}
    </div>
  );
}
