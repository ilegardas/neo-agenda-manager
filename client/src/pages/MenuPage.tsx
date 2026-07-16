import { useState } from "react";
import { usePublicMenu } from "@/hooks/use-menu";
import { usePublicSubscriptionStatus } from "@/hooks/use-subscription";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiWhatsapp } from "react-icons/si";
import { ShoppingCart, Minus, Plus, Package, Lock, Eye, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";

interface MenuPageProps {
  userId: string;
}

export default function MenuPage({ userId }: MenuPageProps) {
  const { data, isLoading } = usePublicMenu(userId);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const { data: currentUser } = useUser();
  const isOwner = !!currentUser && currentUser.id === userId;
  const { data: subStatus, isLoading: subLoading } = usePublicSubscriptionStatus(userId);

  const items = data?.items ?? [];
  const legend = data?.legend ?? null;
  const whatsappPhone = data?.whatsappPhone ?? null;
  const profileName = data?.profileName ?? "";
  const profileImage = data?.profileImage ?? null;

  const total = items.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.price, 0);
  const hasOrder = Object.values(quantities).some((q) => q > 0);

  function setQty(id: number, delta: number) {
    setQuantities((prev) => {
      const next = { ...prev };
      const cur = next[id] ?? 0;
      const val = Math.max(0, cur + delta);
      if (val === 0) delete next[id];
      else next[id] = val;
      return next;
    });
  }

  function buildWhatsAppMessage() {
    const lines = items
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => `• ${quantities[item.id]}x ${item.name} — $${(quantities[item.id] * item.price).toLocaleString('es-MX')}`);
    const msg = `Hola, me gustaría hacer el siguiente pedido:\n\n${lines.join('\n')}\n\n*Total: $${total.toLocaleString('es-MX')}*`;
    return `https://wa.me/${whatsappPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  }

  if (isLoading || subLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPagePublic = subStatus?.active;
  const isPreview = isOwner && !isPagePublic;

  if (!isPagePublic && !isOwner) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">Menú No Disponible</h1>
          <p className="text-muted-foreground text-lg">
            Este menú digital no está activo en este momento. El proveedor necesita activar su plan de suscripción.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {isPreview && (
        <div className="bg-amber-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Vista previa — Este es tu menú digital. Los visitantes ven esta página como privada hasta que actives una suscripción.</span>
          </div>
          <Link href="/">
            <Button size="sm" variant="secondary" className="shrink-0 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0">
              <CreditCard className="w-3.5 h-3.5" />
              Activar plan
            </Button>
          </Link>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm" style={isPreview ? { top: '3.5rem' } : {}}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {profileImage && (
            <img src={profileImage} alt={profileName} className="w-10 h-10 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profileName || "Menú"}</h1>
            <p className="text-xs text-gray-400">Menú en línea</p>
          </div>
          {hasOrder && !isPreview && (
            <div className="ml-auto flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-medium">
              <ShoppingCart className="w-4 h-4" />
              <span>${total.toLocaleString('es-MX')}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Package className="w-14 h-14 text-gray-200" />
            <p className="text-gray-400 text-lg">Este menú aún no tiene productos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {items.filter(i => i.available).map((item) => {
                const qty = quantities[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    data-testid={`card-menu-item-${item.id}`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    {item.imageData ? (
                      <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                        <img
                          src={item.imageData}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1 gap-2">
                      <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 leading-snug flex-1">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-lg font-bold text-primary">${item.price.toLocaleString('es-MX')}</span>
                        {!isPreview && (
                          <div className="flex items-center gap-2">
                            {qty > 0 && (
                              <button
                                data-testid={`btn-decrease-${item.id}`}
                                onClick={() => setQty(item.id, -1)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className="w-6 text-center font-semibold text-gray-900 text-sm" data-testid={`qty-${item.id}`}>{qty}</span>
                            )}
                            <button
                              data-testid={`btn-increase-${item.id}`}
                              onClick={() => setQty(item.id, 1)}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                                qty > 0 ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                              )}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {legend && (
              <p className="mt-8 text-center text-sm text-gray-400 italic border-t border-gray-100 pt-6">{legend}</p>
            )}

            {hasOrder && whatsappPhone && !isPreview && (
              <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20">
                <a
                  href={buildWhatsAppMessage()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="btn-send-order"
                  className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3.5 shadow-xl shadow-green-500/30 font-semibold text-base transition-all hover:scale-105 active:scale-95"
                >
                  <SiWhatsapp className="w-5 h-5" />
                  Hacer pedido — ${total.toLocaleString('es-MX')}
                </a>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
