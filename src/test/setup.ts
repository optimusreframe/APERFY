import "@testing-library/jest-dom";

function createMemoryStorage(): Storage {
  let values: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear() {
      values = {};
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    key(index) {
      return Object.keys(values)[index] ?? null;
    },
    removeItem(key) {
      delete values[key];
    },
    setItem(key, value) {
      values[key] = String(value);
    },
  };
}

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: createMemoryStorage() });
}

if (typeof globalThis.sessionStorage === "undefined") {
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: createMemoryStorage() });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
