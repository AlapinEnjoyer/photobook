import type { CSSProperties } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { photoPath } from "../../core/routes";
import type { Photo } from "../../core/types";
import { useApp } from "../store";
import { PlayIcon } from "./Icons";

export type Watch = (el: Element, onNear: () => void) => () => void;

const POSTER_FALLBACK = 1.2;

const posterTime = (v: HTMLVideoElement) =>
  Math.min(Number(v.dataset.poster ?? POSTER_FALLBACK), Math.max(0, (v.duration || 3) - 0.1));

function preview(tile: HTMLElement, on: boolean) {
  const v = tile.querySelector("video");
  if (!v) return;
  if (on) {
    v.play()?.catch(() => {});
    return;
  }
  v.pause();
  v.currentTime = posterTime(v);
}

function Clip({ photo, tile, watch }: { photo: Photo; tile: { current: HTMLElement | null }; watch: Watch }) {
  const [near, setNear] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (tile.current) return watch(tile.current, () => setNear(true));
  }, [tile, watch]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;

    const seek = () => {
      try {
        el.currentTime = posterTime(el);
      } catch {}
    };
    const reveal = () => {
      el.style.opacity = "1";
    };

    el.addEventListener("loadedmetadata", seek);
    el.addEventListener("loadeddata", reveal);
    el.addEventListener("seeked", reveal);
    el.addEventListener("playing", reveal);
    if (el.readyState >= 1) seek();
    if (el.readyState >= 2) reveal();

    return () => {
      el.removeEventListener("loadedmetadata", seek);
      el.removeEventListener("loadeddata", reveal);
      el.removeEventListener("seeked", reveal);
      el.removeEventListener("playing", reveal);
    };
  }, []);

  return (
    <>
      {/* Keep mounted so seek listeners survive lazy src assignment. */}
      <video
        className="pb-cell-video"
        src={near ? photo.video : undefined}
        poster={photo.src}
        ref={video}
        data-poster={photo.poster}
        muted
        loop
        playsInline
        preload={near ? "metadata" : "none"}
        tabIndex={-1}
        aria-hidden="true"
      />
      <span className="pb-cell-play" aria-hidden="true">
        <PlayIcon />
      </span>
    </>
  );
}

interface Props {
  photo: Photo;
  index: number;
  watch: Watch;
}

export default function Tile({ photo, index, watch }: Props) {
  const { book } = useApp();
  const tile = useRef<HTMLAnchorElement | null>(null);
  const isVideo = photo.kind === "video";

  const style = {
    "--w": photo.width,
    "--h": photo.height,
    "--delay": `${Math.min(index * 0.035, 0.6).toFixed(3)}s`,
  } as CSSProperties;

  const hover = (on: boolean) => (e: { currentTarget: HTMLElement }) => preview(e.currentTarget, on);

  return (
    <a
      className="pb-cell"
      href={photoPath(photo.id)}
      style={style}
      ref={tile}
      draggable={false}
      onMouseEnter={hover(true)}
      onMouseLeave={hover(false)}
      onFocus={hover(true)}
      onBlur={hover(false)}
    >
      <img
        className="pb-cell-img"
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={book.sizes}
        alt={photo.alt || photo.title}
        loading={index < 8 ? "eager" : "lazy"}
        fetchPriority={index === 0 && !book.loadedOnPhoto ? "high" : "auto"}
        decoding="async"
        draggable={false}
      />
      {isVideo && <Clip photo={photo} tile={tile} watch={watch} />}
      {book.showCaptions && photo.caption && <span className="pb-cell-cap">{photo.caption}</span>}
    </a>
  );
}
