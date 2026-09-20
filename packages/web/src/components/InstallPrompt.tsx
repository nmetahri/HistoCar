import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const DISMISSED_KEY = "histocar:install-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function isInstalled(): boolean {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    function capture(event: Event): void {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  function dismiss(): void {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Navigation privée ou stockage bloqué : la bannière réapparaîtra.
    }
  }

  async function install(): Promise<void> {
    await installEvent?.prompt();
    setInstallEvent(null);
  }

  if (dismissed || isInstalled()) {
    return null;
  }

  // iOS n'émet jamais beforeinstallprompt : seule la procédure manuelle existe.
  const showIosHint = !installEvent && isIos();
  if (!installEvent && !showIosHint) {
    return null;
  }

  return (
    <aside className="install-banner">
      {showIosHint ? (
        <p>Installer HistoCar : bouton Partager, puis « Sur l'écran d'accueil ».</p>
      ) : (
        <>
          <p>Installer HistoCar sur cet appareil ?</p>
          <button type="button" className="btn btn-primary" onClick={install}>
            Installer
          </button>
        </>
      )}
      <button type="button" className="btn btn-ghost" onClick={dismiss}>
        Masquer
      </button>
    </aside>
  );
}
