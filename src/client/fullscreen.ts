type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
};

export function element(): Element | null {
  const d = document as FsDocument;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function exit(): void {
  const d = document as FsDocument;
  const p = document.exitFullscreen ? document.exitFullscreen() : d.webkitExitFullscreen?.();
  if (p instanceof Promise) p.catch(() => {});
}

// Promote documentElement so fixed-position overlays cover the fullscreen viewport.
export async function request(): Promise<void> {
  const root = document.documentElement as FsElement;
  const req = root.requestFullscreen ?? root.webkitRequestFullscreen;
  if (!req) return;
  try {
    await req.call(root, { navigationUI: "hide" });
  } catch {}
}
