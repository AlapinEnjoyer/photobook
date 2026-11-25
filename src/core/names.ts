const nameCollator = new Intl.Collator("en", { numeric: true });

export const RESERVED_COLLECTIONS: ReadonlySet<string> = new Set(["all", "featured", "collections", "about"]);

export function stem(name: string): string {
  const extensionStart = name.lastIndexOf(".");
  if (extensionStart <= 0 || extensionStart === name.length - 1) return name;
  return name.slice(0, extensionStart);
}

export function humanise(name: string): string {
  const filename = /\.[a-z][a-z0-9]*$/i.test(name) ? stem(name) : name;
  const words = filename
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export function sortByName(a: string, b: string): number {
  return nameCollator.compare(a, b);
}

export function sourceKey(collection: string, file: string): string {
  return [collection, file].filter(Boolean).join("/");
}

export function photoId(collection: string, file: string): string {
  return stem(sourceKey(collection, file));
}

export function frames(n: number): string {
  return `${n} ${n === 1 ? "frame" : "frames"}`;
}

export function assertValidCollection(key: string): void {
  if (key.includes("/")) {
    throw new Error(`[photobook] nested photo collections are not supported: src/photos/${key}/`);
  }
  if (RESERVED_COLLECTIONS.has(key)) {
    throw new Error(
      `[photobook] "${key}" is reserved for the app menu and cannot be used as a collection folder.`,
    );
  }
}

export function assertValidBook(entries: readonly { collection: string; file: string }[]): void {
  const byId = new Map<string, string>();
  for (const { collection, file } of entries) {
    if (collection) assertValidCollection(collection);

    const id = photoId(collection, file);
    const path = sourceKey(collection, file);
    const first = byId.get(id);
    if (first) {
      throw new Error(
        `[photobook] src/photos/${first} and src/photos/${path} both claim /photos/${id}/. Rename one.`,
      );
    }
    byId.set(id, path);
  }
}
