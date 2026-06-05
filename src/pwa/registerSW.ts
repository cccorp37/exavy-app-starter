// Guarded PWA registration: only runs in production on the deployed app.
// Ensures published updates are picked up immediately without breaking
// Lovable preview/dev environments.

const SW_URL = "/sw.js";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

function shouldRefuse(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true; // iframe
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") return true;
  if (isPreviewHost()) return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith("/sw.js") || url.endsWith("/service-worker.js");
        })
        .map((r) => r.unregister())
    );
  } catch {
    // ignore
  }
}

export async function registerPWA() {
  if (shouldRefuse()) {
    await unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { type: "classic" });

    // Auto-activate any waiting worker (skipWaiting in generated SW).
    const promoteWaiting = (w: ServiceWorker | null) => {
      if (!w) return;
      // The generated SW listens for SKIP_WAITING.
      try { w.postMessage({ type: "SKIP_WAITING" }); } catch { /* noop */ }
    };

    if (reg.waiting) promoteWaiting(reg.waiting);

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          promoteWaiting(reg.waiting || installing);
        }
      });
    });

    // When a new SW takes control, reload once so users see fresh assets.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    // Periodically check for updates (every 30 min) and on focus.
    const checkForUpdate = () => { reg.update().catch(() => {}); };
    setInterval(checkForUpdate, 30 * 60 * 1000);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  } catch {
    // Registration failed — ignore silently.
  }
}
