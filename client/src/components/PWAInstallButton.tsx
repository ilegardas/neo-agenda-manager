import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Don't show on public landing/booking pages — they have their own install button
    if (window.location.pathname.startsWith("/landing/") ||
        window.location.pathname.startsWith("/book/") ||
        window.location.pathname.startsWith("/menu/") ||
        window.location.pathname.startsWith("/checkin/") ||
        window.location.pathname.startsWith("/catalog/")) {
      return;
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed before
    if (sessionStorage.getItem("pwa-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
    setShowIOSInstructions(false);
  };

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      } else {
        handleDismiss();
      }
      setInstallPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  if (isInstalled || dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  return (
    <>
      {/* Install banner */}
      <div
        data-testid="pwa-install-banner"
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shadow-lg"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <img src="/logo.png" alt="miGestion" className="w-9 h-9 rounded-lg flex-shrink-0 object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Instalar miGestion.pro</p>
          <p className="text-xs opacity-80 leading-tight">Accede rápido desde tu pantalla de inicio</p>
        </div>
        <button
          data-testid="button-pwa-install"
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-white text-primary font-semibold text-sm px-3 py-1.5 rounded-full flex-shrink-0 hover:bg-white/90 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>
        <button
          data-testid="button-pwa-dismiss"
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-1"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS instructions modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Instalar en iPhone / iPad</h3>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Toca el botón <Share className="inline w-4 h-4 mx-0.5 text-blue-500" /> <strong>Compartir</strong> en la barra de Safari (parte inferior de la pantalla)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Desplázate y toca <strong>"Agregar a pantalla de inicio"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Toca <strong>"Agregar"</strong> en la esquina superior derecha</span>
              </li>
            </ol>
            <button
              onClick={handleDismiss}
              className="mt-5 w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
