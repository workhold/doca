export function canDownloadOfflineShell() {
  return (
    import.meta.env.PROD &&
    window === window.top &&
    window.isSecureContext &&
    "serviceWorker" in navigator
  );
}

export async function downloadOfflineShell() {
  const registration = await navigator.serviceWorker.register(
    "/doca-offline-worker.js",
    {
      updateViaCache: "none",
    },
  );
  if (registration.active) return;
  const worker = registration.installing ?? registration.waiting;
  if (!worker) throw Error("Offline frontend installation did not start");
  await new Promise<void>((resolve, reject) => {
    const changed = () => {
      if (worker.state !== "activated" && worker.state !== "redundant") return;
      worker.removeEventListener("statechange", changed);
      if (worker.state === "activated") resolve();
      else reject(Error("Offline frontend installation failed"));
    };
    worker.addEventListener("statechange", changed);
    changed();
  });
}
