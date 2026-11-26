import { createContext } from "preact";
import { useContext, useLayoutEffect, useRef, useState } from "preact/hooks";
import { poolFor, poolKey } from "../core/pool";
import type { View } from "../core/routes";
import type { Category, Collection, Photo } from "../core/types";
import type { Navigator } from "./navigate";

export interface AppState {
  view: View;
  scope: string;
  photos: Photo[];
  complete: boolean;
  menu: "closed" | "open" | "closing";
  wash: boolean;
  lastCollection: string | null;
}

export interface Book {
  siteTitle: string;
  collections: Collection[];
  categories: Category[];
  rowHeight: number;
  showCaptions: boolean;
  sizes: string;
  personalSite: { label: string; href: string } | null;
  loadedOnPhoto: boolean;
}

export interface Store {
  get(): AppState;
  set(patch: Partial<AppState>): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export interface App {
  store: Store;
  nav: Navigator;
  book: Book;
}

// Per-island context prevents state leaking across pages during SSR builds.
export const AppContext = createContext<App | null>(null);

export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("[photobook] rendered outside the app");
  return app;
}

export function useStore<T>(select: (state: AppState) => T): T {
  const { store } = useApp();
  const [value, setValue] = useState<T>(() => select(store.get()));
  const latest = useRef(select);
  latest.current = select;

  useLayoutEffect(() => {
    const sync = () => setValue(() => latest.current(store.get()));
    sync();
    return store.subscribe(sync);
  }, [store]);

  return value;
}

export type Screen = "grid" | "collections" | "about";

export function screenOf(view: View): Screen {
  if (view.kind === "collections" || view.kind === "about") return view.kind;
  return "grid";
}

const pools = new WeakMap<Photo[], Map<string, Photo[]>>();

export function poolOf(photos: Photo[], key: string): Photo[] {
  let byKey = pools.get(photos);
  if (!byKey) {
    byKey = new Map();
    pools.set(photos, byKey);
  }
  let pool = byKey.get(key);
  if (!pool) {
    pool = poolFor(photos, key);
    byKey.set(key, pool);
  }
  return pool;
}

const NO_PHOTOS: Photo[] = [];

export function currentPool(state: AppState): Photo[] {
  const key = poolKey(state);
  return key == null ? NO_PHOTOS : poolOf(state.photos, key);
}

export function openIndex(state: AppState): number | null {
  if (state.view.kind !== "photo") return null;
  const { id } = state.view;
  const index = currentPool(state).findIndex((p) => p.id === id);
  return index >= 0 ? index : null;
}
