import { useState, useEffect, useRef } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  userId: string;
  businessName: string;
  logoUrl: string | null;
  bgColor?: string;
}

export default function LandingPWAInstall({ userId, businessName, logoUrl, bgColor = "#0f172a" }: Props) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const swReady = useRef(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) { setIsInstalled(true); return; }

    // Check if dismissed this session
    if (sessionStorage.getItem(`pwa-landing-dismissed-${userId}`) === "1") {
      setDismissed(true);
      return;
    }

    // Register service worker and tell it we're on this user's landing page
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "SET_LANDING_USER", userId });
        swReady.current = true;
      });
    }

    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Capture Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      // Clear SW landing user when leaving the page
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({ type: "CLEAR_LANDING_USER" });
        });
      }
    };
  }, [userId]);

  const handleDismiss = () => {
    sessionStorage.setItem(`pwa-landing-dismissed-${userId}`, "1");
    setDismissed(true);
    setShowIOSInstructions(false);
  };

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      else handleDismiss();
      setInstallPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      // Fallback: show generic instructions
      setShowIOSInstructions(true);
    }
  };

  if (isInstalled || dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  // Pick a contrasting text color relative to bgColor
  const isDark = (() => {
    try {
      const hex = bgColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    } catch { return true; }
  })();

  const bannerBg = bgColor;
  const bannerText = isDark ? "#ffffff" : "#0f172a";
  const btnBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const btnBorder = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";

  return (
    <>
      {/* Install banner */}
      <div
        data-testid="landing-pwa-banner"
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: bannerBg,
          color: bannerText,
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Business logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName}
            className="w-10 h-10 rounded-xl flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-bold"
            style={{ backgroundColor: btnBg, color: bannerText }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: bannerText }}>
            {businessName}
          </p>
          <p className="text-xs leading-tight" style={{ color: bannerText, opacity: 0.7 }}>
            Agregar a pantalla de inicio
          </p>
        </div>

        <button
          data-testid="button-landing-pwa-install"
          onClick={handleInstall}
          className="flex items-center gap-1.5 font-semibold text-sm px-3 py-1.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
          style={{
            backgroundColor: btnBg,
            color: bannerText,
            border: `1px solid ${btnBorder}`,
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>

        <button
          data-testid="button-landing-pwa-dismiss"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 transition-opacity hover:opacity-80"
          style={{ color: bannerText, opacity: 0.6 }}
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS / generic instructions modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60">
          <div className="w-full max-w-sm mx-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-base text-foreground">Instalar {businessName}</h3>
                <p className="text-xs text-muted-foreground">Agrega el acceso directo a tu celular</p>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Toca el botón <Share className="inline w-4 h-4 mx-0.5 text-blue-500" /> <strong className="text-foreground">Compartir</strong> en la barra de Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Elige <strong className="text-foreground">"Agregar a pantalla de inicio"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Toca <strong className="text-foreground">"Agregar"</strong> — ¡listo!</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Toca el menú <strong className="text-foreground">⋮</strong> de tu navegador</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Elige <strong className="text-foreground">"Agregar a pantalla de inicio"</strong></span>
                </li>
              </ol>
            )}

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
