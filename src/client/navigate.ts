import { poolKey } from "../core/pool";
import type { View } from "../core/routes";
import { catalogPath, parsePath, poolView, viewPath, viewTitle } from "../core/routes";
import type { Category, Collection, Photo } from "../core/types";
import { viewFromClick } from "./links";
import type { Store } from "./store";

interface EntryState {
  scope?: string;
  opened?: boolean;
}

interface Options {
  siteTitle: string;
  collections: Collection[];
  categories: Category[];
  embedded: { key: string | null; complete: boolean };
}

export interface Navigator {
  start(): () => void;
  stepTo(id: string): void;
  closePhoto(): void;
}

async function fetchCatalog(): Promise<Photo[]> {
  const res = await fetch(catalogPath());
  if (!res.ok) throw new Error(`catalog request failed: ${res.status}`);
  return ((await res.json()) as { photos: Photo[] }).photos;
}

const entry = (): EntryState => (window.history.state as EntryState | null) ?? {};

export function createNavigator(store: Store, options: Options): Navigator {
  const { siteTitle, collections, categories, embedded } = options;

  let latest = 0;
  let catalog: Promise<Photo[] | null> | null = null;

  function loadCatalog(): Promise<Photo[] | null> {
    if (store.get().complete) return Promise.resolve(store.get().photos);
    catalog ??= fetchCatalog().then(
      (photos) => {
        store.set({ photos, complete: true });
        return photos;
      },
      (err) => {
        catalog = null;
        console.warn("[photobook] could not load catalog.json —", err);
        return null;
      },
    );
    return catalog;
  }

  const holds = (key: string | null) =>
    key == null || store.get().complete || (key === embedded.key && embedded.complete);

  function known(view: View): boolean {
    if (view.kind === "about") return categories.some((c) => c.key === "about");
    if (view.kind === "featured") return categories.some((c) => c.key === "featured");
    if (view.kind === "collection") return collections.some((c) => c.key === view.key);
    return view.kind !== "unknown";
  }

  function resolveScope(view: View, scope: string | undefined, photos: Photo[]): string | null {
    if (view.kind !== "photo") return store.get().scope;
    if (scope) return scope;
    const photo = photos.find((p) => p.id === view.id);
    return photo ? photo.collection || "all" : null;
  }

  async function show(
    view: View,
    scope: string | undefined,
    commit: (scope: string) => void,
    onFail: () => void,
  ) {
    const move = ++latest;
    if (!known(view)) return;

    let { photos } = store.get();
    let resolved = resolveScope(view, scope, photos);
    if (resolved == null && store.get().complete) return;

    const wanted = view.kind === "photo" ? resolved : poolKey({ view, scope: resolved ?? "all" });
    if (resolved == null || !holds(wanted)) {
      const fetched = await loadCatalog();
      if (move !== latest) return;
      if (!fetched) {
        onFail();
        return;
      }
      photos = fetched;
      resolved = resolveScope(view, scope, photos);
      if (resolved == null) return;
    }

    commit(resolved);
    store.set({ view, scope: resolved });
    document.title = viewTitle(view, siteTitle, collections, photos);
  }

  function go(view: View, replace = false, state: EntryState = {}) {
    const path = viewPath(view);
    void show(
      view,
      state.scope,
      (scope) => {
        const next = { ...state, scope };
        if (replace || window.location.pathname === path) window.history.replaceState(next, "", path);
        else window.history.pushState(next, "", path);
      },
      () => window.location.assign(path),
    );
  }

  function follow(view: View) {
    const { view: current, menu } = store.get();
    if (menu === "open") store.set({ menu: "closing" });

    if (current.kind === "photo") {
      if (view.kind === "photo") stepTo(view.id);
      else closePhoto();
      return;
    }
    if (view.kind === "photo") {
      const scope = poolKey(store.get()) ?? "all";
      go(view, false, { scope, opened: true });
      return;
    }
    if (view.kind === "collection") store.set({ lastCollection: view.key });
    if (view.kind === "collections" && menu === "open") store.set({ lastCollection: null });
    go(view);
  }

  function stepTo(id: string) {
    go({ kind: "photo", id }, true, { ...entry(), scope: store.get().scope });
  }

  function closePhoto() {
    if (store.get().view.kind !== "photo") return;
    // Use history.back() to avoid duplicate grid entries in browser history.
    if (entry().opened) window.history.back();
    else go(poolView(store.get().scope), true);
  }

  const onClick = (e: MouseEvent) => {
    const view = viewFromClick(e);
    if (!view) return;
    e.preventDefault();
    follow(view);
  };

  const onPop = () => {
    const view = parsePath(window.location.pathname);
    void show(
      view,
      entry().scope,
      () => {},
      () => window.location.reload(),
    );
  };

  return {
    start() {
      window.addEventListener("popstate", onPop);
      document.addEventListener("click", onClick);
      if (!store.get().complete) void loadCatalog();
      return () => {
        window.removeEventListener("popstate", onPop);
        document.removeEventListener("click", onClick);
      };
    },
    stepTo,
    closePhoto,
  };
}
