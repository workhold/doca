import type { Detail, Resource } from "@web/shared/api.js";
import {
  isRecord,
  readStartupSession,
  startupIdPattern,
  startupSessionKey,
  type StartupSession,
} from "@web/shared/document-startup-cache.js";
import {
  hasReplica,
  replicaCodecs,
  replicaKey,
  replicaKeysForAccount,
} from "./replica-database.js";

const catalogName = "doca-offline-catalog-v1";
const storeName = "documents";
const catalogChanged = "doca-offline-catalog-changed";

type CachedDocument = { detail: Detail; library: Resource | null };
type CatalogRecord = {
  accountId: string;
  resourceId: string;
  scope: string;
  checkedAt: number;
  document: CachedDocument | null;
};

function current(session: StartupSession) {
  return readStartupSession()?.scope === session.scope;
}

function validResource(value: unknown): value is Resource {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    startupIdPattern.test(value.id) &&
    (value.kind === "document" || value.kind === "library") &&
    typeof value.format === "string" &&
    Object.hasOwn(replicaCodecs, value.format) &&
    typeof value.title === "string" &&
    typeof value.owner_id === "string" &&
    typeof value.role === "string" &&
    ["reader", "commenter", "editor", "manager", "owner"].includes(
      value.role,
    ) &&
    Number.isInteger(value.version) &&
    (value.access_mode === "inherit" || value.access_mode === "custom") &&
    typeof value.visibility === "string" &&
    ["invited", "requestable", "authenticated", "public"].includes(
      value.visibility,
    ) &&
    (value.library_id === null || typeof value.library_id === "string") &&
    (value.parent_id === null || typeof value.parent_id === "string") &&
    value.deleted_at === null &&
    (value.page_width == null || typeof value.page_width === "string") &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function validDocument(value: unknown): value is CachedDocument {
  if (!isRecord(value) || !isRecord(value.detail)) return false;
  const { detail, library } = value;
  return (
    validResource(detail.resource) &&
    detail.resource.kind === "document" &&
    !detail.resource.knowledgeBook &&
    Array.isArray(detail.comments) &&
    detail.comments.length === 0 &&
    Array.isArray(detail.grants) &&
    detail.grants.length === 0 &&
    typeof detail.ownerName === "string" &&
    (detail.lastEditorName === null ||
      typeof detail.lastEditorName === "string") &&
    (detail.lastEditedAt === null || typeof detail.lastEditedAt === "string") &&
    typeof detail.likes === "number" &&
    typeof detail.liked === "boolean" &&
    typeof detail.favorite === "boolean" &&
    typeof detail.pinned === "boolean" &&
    (library === null ||
      (validResource(library) &&
        library.kind === "library" &&
        library.id === detail.resource.library_id))
  );
}

function validRow(row: unknown): row is CatalogRecord {
  return (
    isRecord(row) &&
    typeof row.accountId === "string" &&
    startupIdPattern.test(row.accountId) &&
    typeof row.resourceId === "string" &&
    startupIdPattern.test(row.resourceId) &&
    typeof row.scope === "string" &&
    startupIdPattern.test(row.scope) &&
    typeof row.checkedAt === "number" &&
    Number.isFinite(row.checkedAt) &&
    (row.document === null ||
      (validDocument(row.document) &&
        row.document.detail.resource.id === row.resourceId))
  );
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void,
) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(catalogName, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(storeName, {
        keyPath: ["accountId", "resourceId"],
      });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let value: T;
      tx.oncomplete = () => resolve(value!);
      tx.onabort = () => reject(tx.error);
      run(tx.objectStore(storeName), (result) => {
        value = result;
      });
    });
  } finally {
    db.close();
  }
}

function readRows<T>(request: (store: IDBObjectStore) => IDBRequest<T>) {
  return transact<T>("readonly", (store, result) => {
    const read = request(store);
    read.onsuccess = () => result(read.result);
  });
}

export function notifyOfflineDocumentsChanged() {
  window.dispatchEvent(new Event(catalogChanged));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(catalogName);
    channel.postMessage(null);
    channel.close();
  }
}

export function watchOfflineDocuments(refresh: () => void) {
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(catalogName);
  const storage = (event: StorageEvent) => {
    if (event.key === startupSessionKey || event.key === null) refresh();
  };
  if (channel) channel.onmessage = refresh;
  window.addEventListener(catalogChanged, refresh);
  window.addEventListener("storage", storage);
  return () => {
    channel?.close();
    window.removeEventListener(catalogChanged, refresh);
    window.removeEventListener("storage", storage);
  };
}

async function commit(session: StartupSession, row: CatalogRecord) {
  if (!current(session)) return;
  try {
    const changed = await transact<boolean>("readwrite", (store, result) => {
      const read = store.get([row.accountId, row.resourceId]);
      read.onsuccess = () => {
        const previous: unknown = read.result;
        if (
          !current(session) ||
          (previous !== undefined && !validRow(previous))
        ) {
          result(false);
          return;
        }
        // A late successful response must not overwrite a newer explicit denial.
        if (
          previous?.scope === row.scope &&
          (previous.checkedAt > row.checkedAt ||
            (previous.checkedAt === row.checkedAt &&
              !previous.document &&
              row.document))
        ) {
          result(false);
          return;
        }
        store.put(row);
        result(true);
      };
    });
    if (changed) notifyOfflineDocumentsChanged();
  } catch {
    /* The online document and its durable replica can still be used. */
  }
}

export const catalogTime = () => performance.timeOrigin + performance.now();

export function cacheOfflineDocument(
  session: StartupSession,
  detail: Detail,
  library: Resource | null,
  checkedAt: number,
) {
  const document: CachedDocument = {
    detail: {
      resource: detail.resource,
      ownerName: detail.ownerName,
      lastEditorName: detail.lastEditorName,
      lastEditedAt: detail.lastEditedAt,
      likes: detail.likes,
      liked: detail.liked,
      favorite: detail.favorite,
      pinned: detail.pinned,
      comments: [],
      grants: [],
      commentsNextCursor: null,
    },
    library: library?.id === detail.resource.library_id ? library : null,
  };
  if (!validDocument(document)) return;
  return commit(session, {
    accountId: session.bootstrap.user.id,
    resourceId: detail.resource.id,
    scope: session.scope,
    checkedAt,
    document,
  });
}

export function forgetOfflineDocument(
  session: StartupSession,
  resourceId: string,
) {
  return commit(session, {
    accountId: session.bootstrap.user.id,
    resourceId,
    scope: session.scope,
    checkedAt: catalogTime(),
    document: null,
  });
}

export async function readOfflineDocument(
  session: StartupSession,
  resourceId: string,
) {
  try {
    const accountId = session.bootstrap.user.id;
    const row = await readRows((store) => store.get([accountId, resourceId]));
    if (
      !validRow(row) ||
      row.scope !== session.scope ||
      !row.document ||
      !current(session)
    )
      return null;
    const { format } = row.document.detail.resource;
    if (
      (await hasReplica(accountId, resourceId, replicaCodecs[format])) &&
      current(session)
    )
      return row.document;
  } catch {}
  return null;
}

export async function listOfflineDocuments(accountId: string) {
  const session = readStartupSession();
  if (session?.bootstrap.user.id !== accountId) return [];
  try {
    const [rows, keys] = await Promise.all([
      readRows((store) =>
        store.getAll(IDBKeyRange.bound([accountId, ""], [accountId, "\uffff"])),
      ),
      replicaKeysForAccount(accountId),
    ]);
    if (!current(session)) return [];
    return rows
      .filter(validRow)
      .sort((a, b) => b.checkedAt - a.checkedAt)
      .flatMap((row) => {
        if (row.scope !== session.scope || !row.document) return [];
        const {
          detail: { resource },
          library,
        } = row.document;
        return keys.has(
          replicaKey(accountId, resource.id, replicaCodecs[resource.format]),
        )
          ? [
              {
                id: resource.id,
                title: resource.title,
                libraryTitle: library?.title,
              },
            ]
          : [];
      });
  } catch {
    return [];
  }
}
