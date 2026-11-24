import type { Bootstrap, User } from "./api.js";

export const startupSessionKey = "doca.offline-session.v1";
export const startupIdPattern = /^[a-f0-9-]{36}$/;
let identityRevision = 0;
export const startupIdentityRevision = () => identityRevision;
export const invalidateStartupIdentity = () => {
  identityRevision++;
};

export type StartupSession = {
  version: 1;
  scope: string;
  bootstrap: Bootstrap & { user: User };
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const optionalString = (value: unknown) =>
  value === undefined || typeof value === "string";
const nullableString = (value: unknown) =>
  value === null || typeof value === "string";

function validSession(value: unknown): value is StartupSession {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.scope !== "string" ||
    !startupIdPattern.test(value.scope) ||
    !isRecord(value.bootstrap)
  )
    return false;
  const b = value.bootstrap;
  return (
    typeof b.siteName === "string" &&
    typeof b.initialized === "boolean" &&
    typeof b.registrationEnabled === "boolean" &&
    isRecord(b.capabilities) &&
    Object.values(b.capabilities).every((flag) => typeof flag === "boolean") &&
    isRecord(b.user) &&
    typeof b.user.id === "string" &&
    startupIdPattern.test(b.user.id) &&
    typeof b.user.display_name === "string" &&
    typeof b.user.admin === "boolean" &&
    optionalString(b.user.public_id) &&
    optionalString(b.defaultLocale) &&
    optionalString(b.defaultTimezone) &&
    (b.needsProfile === undefined || typeof b.needsProfile === "boolean") &&
    (b.forcedLoginMethod === undefined ||
      nullableString(b.forcedLoginMethod)) &&
    (b.authOptions === undefined ||
      (isRecord(b.authOptions) &&
        [
          b.authOptions.passwordEnabled,
          b.authOptions.smsEnabled,
          b.authOptions.recoveryEnabled,
        ].every((flag) => typeof flag === "boolean"))) &&
    Array.isArray(b.plugins) &&
    b.plugins.every(
      (p: unknown) =>
        isRecord(p) &&
        typeof p.id === "string" &&
        typeof p.version === "string",
    )
  );
}

export function readStartupSession(): StartupSession | null {
  try {
    const raw = localStorage.getItem(startupSessionKey);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return validSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function readStartupAccount() {
  return readStartupSession()?.bootstrap.user.id;
}

/** One locally validated session points to the offline document directory. */
export function cacheStartupBootstrap(bootstrap: Bootstrap) {
  if (!bootstrap.user || bootstrap.needsProfile) {
    clearDocumentStartupCache();
    return;
  }
  if (!Array.isArray(bootstrap.plugins)) return;
  try {
    const previous = readStartupSession();
    if (!previous && localStorage.getItem(startupSessionKey)) return;
    if (previous && previous.bootstrap.user.id !== bootstrap.user.id)
      invalidateStartupIdentity();
    const value: StartupSession = {
      version: 1,
      scope:
        previous?.bootstrap.user.id === bootstrap.user.id
          ? previous.scope
          : crypto.randomUUID(),
      bootstrap: {
        siteName: bootstrap.siteName,
        initialized: bootstrap.initialized,
        registrationEnabled: bootstrap.registrationEnabled,
        defaultLocale: bootstrap.defaultLocale,
        defaultTimezone: bootstrap.defaultTimezone,
        needsProfile: bootstrap.needsProfile,
        forcedLoginMethod: bootstrap.forcedLoginMethod,
        authOptions: bootstrap.authOptions,
        capabilities: bootstrap.capabilities,
        plugins: bootstrap.plugins.map(({ id, version }) => ({ id, version })),
        user: {
          id: bootstrap.user.id,
          display_name: bootstrap.user.display_name,
          public_id: bootstrap.user.public_id,
          admin: !!bootstrap.user.admin,
        },
      },
    };
    if (validSession(value))
      localStorage.setItem(startupSessionKey, JSON.stringify(value));
  } catch {
    /* Startup metadata is optional. */
  }
}

/** Revoking the active session hides the directory while retaining replicas and pending work. */
export function clearDocumentStartupCache() {
  invalidateStartupIdentity();
  try {
    if (readStartupSession()) localStorage.removeItem(startupSessionKey);
  } catch {}
}
