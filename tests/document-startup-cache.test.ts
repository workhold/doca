import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Bootstrap } from "@web/shared/api.js";
import {
  cacheStartupBootstrap,
  clearDocumentStartupCache,
  readStartupSession,
  startupSessionKey,
} from "@web/shared/document-startup-cache.js";

const userId = "20000000-0000-4000-8000-000000000001";
const legacyKey = "doca.document-startup.v1";
const bootstrap: Bootstrap = {
  siteName: "Isolated cache test",
  registrationEnabled: false,
  initialized: true,
  user: { id: userId, display_name: "Cache tester", admin: false },
  capabilities: { documents: true },
  plugins: [],
};

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("records a same-account startup scope and only stores display fields", () => {
  cacheStartupBootstrap({
    ...bootstrap,
    token: "must-not-be-cached",
  } as Bootstrap);
  const first = readStartupSession();
  expect(first?.bootstrap).toEqual(bootstrap);
  expect(values.get(startupSessionKey)).not.toContain("must-not-be-cached");
  cacheStartupBootstrap({ ...bootstrap, siteName: "New name" });
  expect(readStartupSession()?.scope).toBe(first?.scope);
  expect(readStartupSession()?.bootstrap.siteName).toBe("New name");
});

it("ignores and preserves the old metadata key across initialization and logout", () => {
  const old = JSON.stringify({ version: 1, bootstrap, documents: [] });
  values.set(legacyKey, old);
  expect(readStartupSession()).toBeNull();
  cacheStartupBootstrap(bootstrap);
  expect(readStartupSession()?.bootstrap.user.id).toBe(userId);
  clearDocumentStartupCache();
  expect(values.get(legacyKey)).toBe(old);
});

it("rotates the directory scope on account change or a subsequent login", () => {
  cacheStartupBootstrap(bootstrap);
  const first = readStartupSession();
  cacheStartupBootstrap({
    ...bootstrap,
    user: { ...bootstrap.user!, id: "20000000-0000-4000-8000-000000000002" },
  });
  expect(readStartupSession()?.scope).not.toBe(first?.scope);
  cacheStartupBootstrap(bootstrap);
  const second = readStartupSession();
  expect(second?.scope).not.toBe(first?.scope);
  cacheStartupBootstrap({ ...bootstrap, needsProfile: true });
  expect(readStartupSession()).toBeNull();
  cacheStartupBootstrap(bootstrap);
  expect(readStartupSession()?.scope).not.toBe(second?.scope);
});

it.each([
  "not JSON",
  JSON.stringify({ version: 2, bootstrap, scope: userId }),
  JSON.stringify({ version: 1, bootstrap }),
])("preserves and refuses unknown or malformed sessions: %s", (raw) => {
  values.set(startupSessionKey, raw);
  expect(readStartupSession()).toBeNull();
  cacheStartupBootstrap(bootstrap);
  clearDocumentStartupCache();
  expect(values.get(startupSessionKey)).toBe(raw);
});

it("keeps existing session on a failure to write metadata", () => {
  cacheStartupBootstrap(bootstrap);
  const raw = values.get(startupSessionKey);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: () => {
      throw new DOMException("quota", "QuotaExceededError");
    },
  });
  cacheStartupBootstrap({ ...bootstrap, siteName: "New title" });
  expect(values.get(startupSessionKey)).toBe(raw);
});

it("shares startup HTTP requests and retries a failed connection instead of memoizing failure", async () => {
  let reject!: (reason: unknown) => void;
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, failure) => {
          reject = failure;
        }),
    )
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(bootstrap), { status: 200 })),
    );
  vi.stubGlobal("fetch", fetch);
  const { loadBootstrap } = await import("@web/shared/bootstrap.js");
  const first = loadBootstrap();
  expect(loadBootstrap()).toBe(first);
  reject(new TypeError("Failed to fetch"));
  await expect(first).rejects.toThrow("Failed to fetch");
  expect(await loadBootstrap()).toEqual(bootstrap);
  expect(await loadBootstrap()).toEqual(bootstrap);
  expect(fetch).toHaveBeenCalledTimes(2);
  await loadBootstrap(true);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("retains the session during a gateway outage and clears it on rejection or logout", async () => {
  const events: string[] = [];
  vi.stubGlobal("window", {
    dispatchEvent: (event: Event) => events.push(event.type),
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 })),
  );
  const { api } = await import("@web/shared/api.js");
  cacheStartupBootstrap(bootstrap);
  await expect(api("/bootstrap")).rejects.toMatchObject({ status: 502 });
  expect(events).toEqual([]);
  expect(readStartupSession()?.bootstrap).toEqual(bootstrap);
  await expect(api("/bootstrap")).rejects.toMatchObject({ status: 401 });
  expect(events).toEqual(["session-expired"]);
  expect(readStartupSession()).toBeNull();
  cacheStartupBootstrap(bootstrap);
  await api("/auth/logout", "POST");
  expect(readStartupSession()).toBeNull();
});

it("refuses a delayed bootstrap response after logout", async () => {
  let respond!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
  );
  const { api } = await import("@web/shared/api.js");
  const { clearDocumentStartupCache: logout } =
    await import("@web/shared/document-startup-cache.js");
  const pending = api("/bootstrap");
  logout();
  respond(new Response(JSON.stringify(bootstrap), { status: 200 }));
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(readStartupSession()).toBeNull();
});
