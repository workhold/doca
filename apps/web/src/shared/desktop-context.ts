let mode: "browser" | "remote" = "browser";
let publicOrigin = globalThis.location?.origin ?? "";

export function updateDesktopContext(headers: Headers) {
  const nextMode = headers.get("X-Doca-Desktop-Mode");
  if (nextMode === "remote") {
    const origin = headers.get("X-Doca-Desktop-Origin") ?? "";
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin)
      throw new Error("Invalid desktop public origin");
    mode = "remote";
    publicOrigin = origin;
  } else {
    mode = "browser";
    publicOrigin = globalThis.location?.origin ?? "";
  }
}

export function workspaceIdentityOrigin() {
  return publicOrigin;
}

export function workspacePublicOrigin() { return mode === "remote" ? publicOrigin : null; }

export function publicWorkspaceUrl(path: string): string {
  return path.startsWith("/")
    ? new URL(path, publicOrigin).href
    : `${publicOrigin}${globalThis.location?.pathname ?? ""}${path}`;
}
