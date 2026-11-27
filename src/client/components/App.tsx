import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { poolKey } from "../../core/pool";
import type { View } from "../../core/routes";
import type { Category, Collection, Photo } from "../../core/types";
import { useAnimationsDone } from "../hooks/useAnimationsDone";
import { createNavigator } from "../navigate";
import type { App as AppModel } from "../store";
import { AppContext, createStore, screenOf, useApp, useStore } from "../store";
import { settleTheme } from "../theme";
import About from "./About";
import Bar from "./Bar";
import Collections from "./Collections";
import Grid from "./Grid";
import { LightboxLayer } from "./Lightbox";
import { MenuLayer } from "./Menu";

interface Props {
  siteTitle: string;
  view: View;
  scope: string;
  photos: Photo[];
  poolComplete: boolean;
  complete: boolean;
  collections: Collection[];
  categories: Category[];
  rowHeight: number;
  showCaptions: boolean;
  sizes: string;
  personalSite: { label: string; href: string } | null;
  children?: ComponentChildren;
}

function createApp(props: Props): AppModel {
  const { siteTitle, view, scope, photos, complete, poolComplete, collections, categories } = props;
  const store = createStore({
    view,
    scope,
    photos,
    complete,
    menu: "closed",
    wash: false,
    lastCollection: null,
  });
  return {
    store,
    nav: createNavigator(store, {
      siteTitle,
      collections,
      categories,
      embedded: { key: poolKey({ view, scope }), complete: poolComplete },
    }),
    book: {
      siteTitle,
      collections,
      categories,
      rowHeight: Math.max(120, props.rowHeight),
      showCaptions: props.showCaptions,
      sizes: props.sizes,
      personalSite: props.personalSite,
      loadedOnPhoto: view.kind === "photo",
    },
  };
}

function Wash() {
  const { store } = useApp();
  const ref = useRef<HTMLDivElement | null>(null);
  useAnimationsDone(ref, true, () => settleTheme(store));
  return <div ref={ref} className="pb-wash" aria-hidden="true" />;
}

function Shell({ children }: { children?: ComponentChildren }) {
  const screen = useStore((state) => screenOf(state.view));
  const wash = useStore((state) => state.wash);

  return (
    <div className="pb-root">
      {wash && <Wash />}
      {screen === "grid" && <Grid />}
      {screen === "about" && <About>{children}</About>}
      {screen === "collections" && <Collections />}
      <Bar />
      <MenuLayer />
      <LightboxLayer />
    </div>
  );
}

export default function App({ children, ...props }: Props) {
  const [app] = useState(() => createApp(props));
  useEffect(() => app.nav.start(), [app]);

  return (
    <AppContext.Provider value={app}>
      <Shell>{children}</Shell>
    </AppContext.Provider>
  );
}
