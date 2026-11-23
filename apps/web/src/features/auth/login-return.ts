const key = "doca.login-document";

export function isDocumentLocation(hash: string): boolean {
  return /^#\/(?:m\/)?r\/[a-f0-9-]{36}(?:\?[^#]*)?$/i.test(hash);
}

export function rememberLoginDocument(hash: string) {
  if (!isDocumentLocation(hash)) return;
  try {
    sessionStorage.setItem(key, hash);
  } catch {}
}

export function takeLoginDocument(): string | null {
  try {
    const hash = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return hash && isDocumentLocation(hash) ? hash : null;
  } catch {
    return null;
  }
}

export const shareTokenFromHash = (value: string) =>
  /^#\/s\/([A-Za-z0-9_-]{43})$/.exec(value)?.[1] ?? null;
export const rememberedShareToken = () => {
  const current = shareTokenFromHash(location.hash);
  if (current) {
    try { sessionStorage.setItem("doca.pending-share-token", current); } catch {}
    return current;
  }
  try { return sessionStorage.getItem("doca.pending-share-token"); } catch { return null; }
};
