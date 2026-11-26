import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

export function useAnimationsDone(ref: RefObject<HTMLElement | null>, active: boolean, done: () => void) {
  const latest = useRef(done);
  latest.current = done;

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    let cancelled = false;
    void Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => {
      if (!cancelled) latest.current();
    });
    return () => {
      cancelled = true;
    };
  }, [active, ref]);
}
