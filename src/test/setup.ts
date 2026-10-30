// Browser APIs jsdom lacks but Radix / Recharts / the theme code touch.
// Skipped for node-environment tests, which have no `window`.
if (typeof window !== "undefined") {
  // Newer Node versions define their own (often unusable) global localStorage that shadows jsdom's.
  if (typeof globalThis.localStorage?.clear !== "function") {
    const store = new Map<string, string>();
    const mem = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
    Object.defineProperty(globalThis, "localStorage", { value: mem, configurable: true });
    Object.defineProperty(window, "localStorage", { value: mem, configurable: true });
  }

  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
        onchange: null,
      }) as MediaQueryList);

  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
}
