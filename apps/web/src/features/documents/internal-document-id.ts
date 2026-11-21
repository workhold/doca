import { workspacePublicOrigin } from "@web/shared/desktop-context.js";

export function internalDocumentId(
  value: string,
  origin: string,
): string | null {
  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin) return null;
    return (
      /^#\/r\/([a-f0-9-]{36})(?:\?|$)/i.exec(url.hash)?.[1]?.toLowerCase() ??
      null
    );
  } catch {
    return null;
  }
}

export function workspaceDocumentId(value: string): string | null {
  const local = internalDocumentId(value, location.origin);
  const remote = workspacePublicOrigin();
  return local ?? (remote ? internalDocumentId(value, remote) : null);
}
