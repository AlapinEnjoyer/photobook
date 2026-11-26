import { useEffect, useRef, useState } from "preact/hooks";
import { stepDirection } from "../../core/pool";
import { photoPath, poolView, viewPath } from "../../core/routes";
import type { Photo } from "../../core/types";
import { useAnimationsDone } from "../hooks/useAnimationsDone";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useFullscreen } from "../hooks/useFullscreen";
import { currentPool, openIndex, useApp, useStore } from "../store";
import Film from "./Film";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, CompressIcon, ExpandIcon } from "./Icons";

const LIGHTBOX_SIZES = "100vw";
const SWIPE_MIN = 40;

function startClip(el: HTMLVideoElement | null) {
  // Set muted as a property before play() so autoplay is not blocked.
  if (!el) return;
  el.muted = true;
  el.play()?.catch(() => {});
}

// Assign sizes before srcset so candidate selection matches the lightbox.
function preloadNeighbours(pool: Photo[], index: number) {
  if (pool.length < 2) return;
  for (const offset of [1, -1, 2]) {
    const photo = pool[(index + offset + pool.length) % pool.length];
    if (!photo || photo.kind === "video") continue;
    const img = new Image();
    img.sizes = LIGHTBOX_SIZES;
    img.srcset = photo.srcSet;
    img.src = photo.full;
  }
}

interface Props {
  pool: Photo[];
  index: number;
  out: boolean;
  root: { current: HTMLDivElement | null };
}

function Lightbox({ pool, index, out, root }: Props) {
  const { nav } = useApp();
  const photo = pool[index];
  const closeRef = useRef<HTMLAnchorElement | null>(null);
  const scope = useStore((state) => state.scope);
  const { full, toggle, exit } = useFullscreen();

  const seen = useRef({ index, dir: 1 as 1 | -1 });
  if (seen.current.index !== index) {
    seen.current = { index, dir: stepDirection(seen.current.index, index, pool.length) };
  }
  const { dir } = seen.current;

  useFocusTrap(root, closeRef);

  useEffect(() => {
    preloadNeighbours(pool, index);
  }, [pool, index]);

  useEffect(() => {
    if (out) exit();
  }, [out, exit]);

  const neighbour = (by: number): Photo | undefined => pool[(index + by + pool.length) % pool.length];
  const step = (by: number) => {
    if (pool.length < 2) return;
    const next = neighbour(by);
    if (next) nav.stepTo(next.id);
  };

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (out || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      if (full) toggle();
      else nav.closePhoto();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "f" || e.key === "F") {
      toggle();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const touch = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      touch.current = null;
      return;
    }
    if (e.target instanceof Element && e.target.closest(".pb-film")) {
      touch.current = null;
      return;
    }
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = start.x - t.clientX;
    const dy = start.y - t.clientY;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
    step(dx > 0 ? 1 : -1);
  };

  const onBackdrop = (e: { target: EventTarget | null }) => {
    if (e.target instanceof Element && !e.target.closest("a, button, img, video, .pb-film")) nav.closePhoto();
  };

  if (!photo) return null;
  const prevPhoto = neighbour(-1);
  const nextPhoto = neighbour(1);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: dialog listens for Escape and provides a focusable Close link
    <div
      className="pb-lb"
      ref={root}
      data-out={out ? "" : undefined}
      data-full={full ? "" : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      onClick={onBackdrop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className="pb-lb-btn pb-lb-full"
        aria-label={full ? "Exit full screen" : "Enter full screen"}
        onClick={toggle}
      >
        {full ? <CompressIcon /> : <ExpandIcon />}
      </button>

      <a ref={closeRef} className="pb-lb-btn pb-lb-close" href={viewPath(poolView(scope))} aria-label="Close">
        <CloseIcon />
      </a>

      <div className="pb-lb-stage">
        {pool.length > 1 && prevPhoto && (
          <a
            className="pb-lb-nav pb-lb-nav--prev"
            href={photoPath(prevPhoto.id)}
            aria-label="Previous"
            tabIndex={full ? -1 : undefined}
            draggable={false}
          >
            <ChevronLeftIcon />
          </a>
        )}

        {photo.kind === "video" ? (
          <video
            key={photo.video}
            className="pb-lb-media"
            data-dir={dir}
            src={photo.video}
            poster={photo.full}
            ref={startClip}
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          <img
            // Keyed per photo for slide animations; omit width/height so letterbox clicks close.
            key={photo.full}
            className="pb-lb-media"
            data-dir={dir}
            src={photo.full}
            srcSet={photo.srcSet}
            sizes={LIGHTBOX_SIZES}
            alt={photo.alt}
            fetchPriority="high"
            draggable={false}
          />
        )}

        {pool.length > 1 && nextPhoto && (
          <a
            className="pb-lb-nav pb-lb-nav--next"
            href={photoPath(nextPhoto.id)}
            aria-label="Next"
            tabIndex={full ? -1 : undefined}
            draggable={false}
          >
            <ChevronRightIcon />
          </a>
        )}
      </div>

      <Film pool={pool} index={index} full={full} />
    </div>
  );
}

export function LightboxLayer() {
  const pool = useStore(currentPool);
  const index = useStore(openIndex);
  const root = useRef<HTMLDivElement | null>(null);

  const held = useRef<{ pool: typeof pool; index: number } | null>(null);
  const [, rerender] = useState(0);
  if (index != null) held.current = { pool, index };

  const out = index == null && held.current != null;
  useAnimationsDone(root, out, () => {
    held.current = null;
    rerender((n) => n + 1);
  });

  if (!held.current) return null;
  return <Lightbox pool={held.current.pool} index={held.current.index} out={out} root={root} />;
}
