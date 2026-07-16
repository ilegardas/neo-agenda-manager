import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CatalogPhoto } from "@shared/schema";
import { usePublicSubscriptionStatus } from "@/hooks/use-subscription";
import { useUser } from "@/hooks/use-auth";
import { Lock, Eye, CreditCard, Images, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
}

export default function CatalogPage({ userId }: Props) {
  const { data: currentUser } = useUser();
  const isOwner = !!currentUser && currentUser.id === userId;
  const { data: subStatus, isLoading: subLoading } = usePublicSubscriptionStatus(userId);

  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: providerSettings } = useQuery<Record<string, string>>({
    queryKey: [api.public.userSettings.path, userId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userSettings.path, { userId }));
      if (!res.ok) return {};
      return res.json();
    },
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<CatalogPhoto[]>({
    queryKey: [api.public.userCatalog.path, userId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userCatalog.path, { userId }));
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subStatus?.active || isOwner,
  });

  const companyName = providerSettings?.profile_name?.trim() || null;
  const companyLogo = providerSettings?.profile_image?.trim() || null;

  const isPageActive = subStatus?.active;
  const isPreview = isOwner && !isPageActive;

  if (!subLoading && !isPageActive && !isOwner) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Catálogo No Disponible</h1>
          <p className="text-muted-foreground text-lg">
            Este catálogo no está activo en este momento. El proveedor necesita activar su plan de suscripción.
          </p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => setLightbox(index);
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox(i => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  const nextPhoto = () => setLightbox(i => (i !== null ? (i + 1) % photos.length : null));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Vista previa — Los visitantes ven esta página como privada hasta que actives una suscripción.</span>
          </div>
          <a
            href="/admin"
            onClick={(e) => { e.preventDefault(); window.location.href = "/admin"; }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Activar suscripción
          </a>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-border sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center gap-4">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName ?? "Logo"} className="w-14 h-14 rounded-xl object-cover border border-border/30 shadow-sm" />
          ) : (
            <div className="bg-primary/10 p-3 rounded-xl">
              <Images className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {companyName || "Catálogo"}
            </h1>
            <p className="text-sm text-muted-foreground">{photos.length} foto{photos.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8${isPreview ? " mt-14" : ""}`}>
        {photosLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Images className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No hay fotos en el catálogo aún</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid group relative cursor-zoom-in overflow-hidden rounded-xl border border-border/30 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => openLightbox(index)}
                data-testid={`img-catalog-${photo.id}`}
              >
                <img
                  src={photo.imageData}
                  alt={photo.caption || `Foto ${index + 1}`}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={closeLightbox}
            data-testid="button-lightbox-close"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            data-testid="button-lightbox-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            data-testid="button-lightbox-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={photos[lightbox].imageData}
              alt={photos[lightbox].caption || `Foto ${lightbox + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            {photos[lightbox].caption && (
              <p className="text-white/80 text-sm text-center">{photos[lightbox].caption}</p>
            )}
            <p className="text-white/40 text-xs">{lightbox + 1} / {photos.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
