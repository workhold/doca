export const replicaCodecs = {
  rich_text: "slate-kit:3",
  markdown: "markdown-ytext:schema-1",
  spreadsheet: "exlsx-cell-registers",
  canvas: "aidcanvas-yjs",
  presentation: "eppt-yjs-v6",
} as const;

export function replicaKey(userId: string, resourceId: string, codec: string) {
  return `${userId}:${resourceId}:${codec}`;
}

export function openReplicaDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("doca-offline-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("replicas");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("本地缓存被其他页面占用"));
  });
}

export async function hasReplica(
  userId: string,
  resourceId: string,
  codec: string,
) {
  const db = await openReplicaDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const request = db
        .transaction("replicas")
        .objectStore("replicas")
        .getKey(replicaKey(userId, resourceId, codec));
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function replicaKeysForAccount(userId: string) {
  const db = await openReplicaDatabase();
  try {
    return await new Promise<Set<IDBValidKey>>((resolve, reject) => {
      const request = db
        .transaction("replicas")
        .objectStore("replicas")
        .getAllKeys(IDBKeyRange.bound(`${userId}:`, `${userId}:\uffff`));
      request.onsuccess = () => resolve(new Set(request.result));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
