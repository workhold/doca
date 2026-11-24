const cachePrefix = "doca-web-shell-v1-";
const cacheName = cachePrefix + shellVersion;
const staticPaths = new Set(shellBuild.staticPaths);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      // Use each build's own HTML and exactly its dependency URLs. It has no account data.
      try {
        for (
          let offset = 0;
          offset < shellBuild.required.length;
          offset += 12
        ) {
          await cache.addAll(
            shellBuild.required
              .slice(offset, offset + 12)
              .map(
                (path) =>
                  new Request(new URL(path, self.location.origin), {
                    credentials: "omit",
                    redirect: "error",
                  }),
              ),
          );
        }
        await cache.put(
          "/",
          new Response(shellBuild.shell, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
        );
      } catch (error) {
        await caches.delete(cacheName);
        throw error;
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function navigate(request) {
  try {
    const response = await fetch(request, {
      signal: AbortSignal.timeout(2500),
    });
    if (response.status < 500) return response;
    const cached = await (await caches.open(cacheName)).match("/");
    return cached ?? response;
  } catch {
    const cached = await (await caches.open(cacheName)).match("/");
    return cached ?? Response.error();
  }
}

async function staticAsset(request, path) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(path);
  if (cached) return cached;
  const response = await fetch(request, {
    credentials: "omit",
    redirect: "error",
  });
  if (response.ok) {
    await cache.put(path, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    event.respondWith(navigate(request));
  } else if (
    !url.search &&
    !request.headers.has("Range") &&
    staticPaths.has(url.pathname)
  ) {
    event.respondWith(staticAsset(request, url.pathname));
  }
});
