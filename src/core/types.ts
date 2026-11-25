import type { ImageFormat } from "./images";

export type PhotoKind = "photo" | "video";

export interface Photo {
  id: string;
  collection: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption?: string;
  featured: boolean;
  kind: PhotoKind;
  src: string;
  srcSet: string;
  full: string;
  thumb: string;
  video?: string;
  poster?: number;
}

export interface Cover {
  src: string;
  srcSet: string;
  sizes: string;
}

export interface Collection {
  key: string;
  name: string;
  year: string;
  countLabel: string;
  cover: Cover | null;
}

export interface Category {
  key: string;
  label: string;
  countLabel?: string;
}

export interface PhotobookConfig {
  site: string;
  title: string;
  description: string;
  ogImage: string;
  personalSite: { label: string; href: string } | null;
  credit: { artist: string; copyright?: string } | null;
  grid: {
    rowHeight: number;
    showCaptions: boolean;
  };
  theme: { default: "light" | "dark" | "system" };
  images: {
    widths: number[];
    format: ImageFormat;
    quality: number;
    sizes: string;
  };
  source: { kind: "local" } | { kind: "remote"; base: string };
}
