export function canDownloadOfflineShell() {
  return (
    import.meta.env.PROD &&
    window === window.top &&
    window.isSecureContext &&
    "serviceWorker" in navigator
  );
}

let preparation: Promise<void> | undefined;

export function downloadOfflineShell() {
  return (preparation ??= installOfflineShell().finally(() => {
    preparation = undefined;
  }));
}

async function installOfflineShell() {
  const registration = await navigator.serviceWorker.register(
    "/doca-offline-worker.js",
    {
      updateViaCache: "none",
    },
  );
  if (registration.active) {
    // The active shell can already start offline while a new build installs.
    if (!registration.installing && !registration.waiting)
      void registration.update().catch(() => {});
    return;
  }
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
