import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import * as fullscreen from "../fullscreen";

export function useFullscreen() {
  const [full, setFull] = useState(false);
  const fullRef = useRef(full);
  fullRef.current = full;

  useEffect(() => {
    const onChange = () => {
      if (!fullscreen.element()) setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      if (fullscreen.element()) fullscreen.exit();
    };
  }, []);

  const exit = useCallback(() => {
    if (fullscreen.element()) fullscreen.exit();
    setFull(false);
  }, []);

  const toggle = useCallback(() => {
    if (fullscreen.element() || fullRef.current) {
      exit();
      return;
    }
    void fullscreen.request().then(() => setFull(true));
  }, [exit]);

  return { full, toggle, exit };
}
