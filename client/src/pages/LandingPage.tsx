import { useState, useMemo, useEffect } from "react";
import { format, startOfWeek, addDays, addMinutes, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { usePublicAvailabilityRules } from "@/hooks/use-availability";
import { usePublicAppointments, useCreatePublicAppointment } from "@/hooks/use-appointments";
import { usePublicSettings } from "@/hooks/use-settings";
import { usePublicMenu } from "@/hooks/use-menu";
import { usePublicSubscriptionStatus } from "@/hooks/use-subscription";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { buildUrl, api } from "@shared/routes";
import LandingPWAInstall from "@/components/LandingPWAInstall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Lock, Eye, CreditCard, CheckCircle, Loader2,
  ChevronLeft, ChevronRight, Clock, X, Phone,
  CalendarCheck, ShoppingBag, Star, ArrowRight, Sparkles,
  Plus, Minus, ShoppingCart, Trash2, MapPin
} from "lucide-react";
import { SiWhatsapp, SiFacebook, SiInstagram, SiTiktok, SiYoutube, SiLinkedin } from "react-icons/si";
import { cn } from "@/lib/utils";

const GOOGLE_FONTS: Record<string, string> = {
  playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap",
  montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap",
  merriweather: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  lato: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap",
};

const FONT_FAMILY: Record<string, string> = {
  inter: "'Inter', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  lato: "'Lato', system-ui, sans-serif",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function darken(hex: string, amount = 30): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface Props { userId: string; }

export default function LandingPage({ userId }: Props) {
  const { data: currentUser } = useUser();
  const isOwner = !!currentUser && currentUser.id === userId;
  const { data: subStatus, isLoading: subLoading } = usePublicSubscriptionStatus(userId);
  const { data: settings = {} } = usePublicSettings(userId);

  const bgColor       = settings.landing_bg_color       || "#0f172a";
  const containerColor = settings.landing_container_color || "#1e293b";
  const font           = settings.landing_font           || "inter";
  const textColor      = settings.landing_text_color     || "#ffffff";
  const showCatalog    = settings.landing_show_catalog   !== "false";
  const showMenu       = settings.landing_show_menu      !== "false";
  const showBooking    = settings.landing_show_booking   !== "false";

  const companyName    = settings.profile_name        || "Mi Negocio";
  const companyLogo    = settings.profile_image       || null;
  const description    = settings.profile_description || "";
  const socialFacebook = settings.social_facebook     || "";
  const socialInstagram= settings.social_instagram    || "";
  const socialTiktok   = settings.social_tiktok       || "";
  const socialYoutube  = settings.social_youtube      || "";
  const socialLinkedin = settings.social_linkedin     || "";
  const googleMapsUrl  = settings.google_maps_url     || "";
  const whatsappPhone  = settings.whatsapp_phone      || "";
  const whatsappMessage= settings.whatsapp_message    || "";

  useEffect(() => {
    const href = GOOGLE_FONTS[font];
    if (!href) return;
    const existing = document.getElementById("landing-font-link");
    if (existing) existing.remove();
    const link = document.createElement("link");
    link.id = "landing-font-link";
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [font]);


  const { data: catalogPhotos = [] } = useQuery<{ id: number; caption: string | null; sortOrder: number }[]>({
    queryKey: [api.public.userCatalog.path, userId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userCatalog.path, { userId }));
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showCatalog,
  });

  const { data: menuData } = usePublicMenu(userId);
  const menuItems = menuData?.items ?? [];

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null);

  const getQty = (id: number) => cart[id] ?? 0;
  const addToCart = (id: number) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeFromCart = (id: number) => setCart(c => {
    const next = { ...c };
    if ((next[id] ?? 0) <= 1) delete next[id]; else next[id]--;
    return next;
  });
  const clearCart = () => setCart({});
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = menuItems.reduce((sum: number, item: any) => sum + (cart[item.id] ?? 0) * item.price, 0);
  const cartItems = menuItems.filter((item: any) => (cart[item.id] ?? 0) > 0);

  function buildOrderMessage() {
    const lines = cartItems.map((item: any) =>
      `• ${item.name} x${cart[item.id]} = $${(item.price * cart[item.id]).toLocaleString('es-MX')}`
    );
    return `Hola, quiero hacer el siguiente pedido:\n\n${lines.join('\n')}\n\n*Total: $${cartTotal.toLocaleString('es-MX')}*`;
  }

  const { data: rules = [] } = usePublicAvailabilityRules(userId);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd   = addDays(weekStart, 6);
  const { data: appointments = [] } = usePublicAppointments(userId, {
    start: weekStart.toISOString(),
    end: weekEnd.toISOString(),
  });
  const createBooking = useCreatePublicAppointment(userId);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const getSlotsForDay = (day: Date) => {
    const dayIndex = day.getDay();
    const dayRules   = rules.filter((r: any) => r.dayOfWeek === dayIndex);
    const available  = dayRules.filter((r: any) => !r.isBreak).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    const breaks     = dayRules.filter((r: any) => r.isBreak).map((br: any) => {
      const [sh, sm] = br.startTime.split(':').map(Number);
      const [eh, em] = br.endTime.split(':').map(Number);
      return { start: setMinutes(setHours(day, sh), sm), end: setMinutes(setHours(day, eh), em) };
    });
    const slots: Array<{ start: Date; end: Date; isBreak: boolean; isBooked: boolean }> = [];
    available.forEach((rule: any) => {
      const [sh, sm] = rule.startTime.split(':').map(Number);
      const [eh, em] = rule.endTime.split(':').map(Number);
      let cur = setMinutes(setHours(day, sh), sm);
      const end = setMinutes(setHours(day, eh), em);
      while (cur < end) {
        const next = addMinutes(cur, 30);
        if (next > end) break;
        const onBreak  = breaks.find((b: any) => b.start < next && b.end > cur);
        const onBooked = appointments.find((a: any) => a.startTime < next && a.endTime > cur && a.status !== 'cancelled');
        slots.push({ start: cur, end: next, isBreak: !!onBreak, isBooked: !!onBooked });
        cur = next;
      }
    });
    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleSlotClick = (slot: { start: Date; end: Date; isBreak: boolean; isBooked: boolean }) => {
    if (slot.isBreak || slot.isBooked) return;
    setSelectedSlot(slot);
    setBookingSuccess(false);
    setFormData({ name: "", phone: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    createBooking.mutate(
      { startTime: selectedSlot.start, endTime: selectedSlot.end, customerName: formData.name, customerPhone: formData.phone, notes: formData.notes, status: 'booked' },
      { onSuccess: () => setBookingSuccess(true) }
    );
  };

  const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  const isPageActive = subStatus?.active;
  const isPreview    = isOwner && !isPageActive;

  if (!isPageActive && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-white/40" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Página No Disponible</h1>
          <p className="text-white/50 text-lg">Este negocio aún no ha activado su página pública.</p>
        </div>
      </div>
    );
  }

  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage || `Hola, me interesa conocer más sobre ${companyName}.`)}`
    : null;

  const darkened = darken(bgColor, 25);
  const accent = containerColor;
  const rgb = hexToRgb(bgColor);
  const accentRgb = hexToRgb(accent);

  const hasSocial = socialFacebook || socialInstagram || socialTiktok || socialYoutube || socialLinkedin || googleMapsUrl;

  return (
    <div
      style={{ backgroundColor: bgColor, fontFamily: FONT_FAMILY[font] || FONT_FAMILY.inter, color: textColor }}
      className="min-h-screen landing-root"
    >
      {/* ── Preview Banner ── */}
      {isPreview && (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-2 sticky top-0 z-50 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Vista previa — Activa una suscripción para que sea pública.</span>
          </div>
          <a href="/admin" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
            <CreditCard className="w-3.5 h-3.5" /> Activar
          </a>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 60% 0%, rgba(${accentRgb},0.35) 0%, transparent 65%), ${bgColor}`,
          paddingTop: isPreview ? "4rem" : "5rem",
          paddingBottom: "5rem",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: accent, transform: "translate(40%, -40%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: accent, transform: "translate(-40%, 40%)" }} />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Logo */}
          {companyLogo && (
            <div className="inline-block mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden mx-auto shadow-2xl ring-4 ring-white/10">
                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight mb-4" style={{ color: textColor }}>
            {companyName}
          </h1>

          {/* Description as tagline */}
          {description && (
            <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
              {description}
            </p>
          )}

          {/* Hero CTA buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-testid="link-landing-whatsapp-hero">
                <button
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  style={{ backgroundColor: "#25D366", color: "#fff" }}
                >
                  <SiWhatsapp className="w-5 h-5" />
                  Escríbenos por WhatsApp
                </button>
              </a>
            )}
            {showBooking && (
              <a href="#reservar">
                <button
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 border border-white/20"
                  style={{ backgroundColor: `rgba(${accentRgb},0.25)`, backdropFilter: "blur(10px)", color: "#fff" }}
                >
                  <CalendarCheck className="w-5 h-5" />
                  Reservar una cita
                </button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Floating social bar ── */}
      {hasSocial && (
        <div
          className="sticky top-0 z-40 py-2.5 px-4 flex items-center justify-center gap-2 flex-wrap border-b"
          style={{
            backgroundColor: `rgba(${rgb},0.85)`,
            backdropFilter: "blur(12px)",
            borderColor: `rgba(255,255,255,0.07)`,
          }}
        >
          {whatsappPhone && (
            <a href={whatsappUrl || "#"} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{ backgroundColor: "#25D366", color: "#fff" }}>
                <SiWhatsapp className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </a>
          )}
          {socialFacebook && (
            <a href={socialFacebook} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all hover:scale-105 text-white">
                <SiFacebook className="w-3.5 h-3.5 text-blue-400" /> Facebook
              </button>
            </a>
          )}
          {socialInstagram && (
            <a href={socialInstagram} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all hover:scale-105 text-white">
                <SiInstagram className="w-3.5 h-3.5 text-pink-400" /> Instagram
              </button>
            </a>
          )}
          {socialTiktok && (
            <a href={socialTiktok} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all hover:scale-105 text-white">
                <SiTiktok className="w-3.5 h-3.5" /> TikTok
              </button>
            </a>
          )}
          {socialYoutube && (
            <a href={socialYoutube} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all hover:scale-105 text-white">
                <SiYoutube className="w-3.5 h-3.5 text-red-400" /> YouTube
              </button>
            </a>
          )}
          {socialLinkedin && (
            <a href={socialLinkedin} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all hover:scale-105 text-white">
                <SiLinkedin className="w-3.5 h-3.5 text-blue-400" /> LinkedIn
              </button>
            </a>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          GALLERY / CATALOG
      ══════════════════════════════════════════ */}
      {showCatalog && catalogPhotos.length > 0 && (
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ backgroundColor: `rgba(${accentRgb},0.2)`, color: "#fff" }}>
                <Sparkles className="w-3.5 h-3.5" />
                GALERÍA
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: textColor }}>Nuestro trabajo</h2>
            </div>

            {/* Scrollable horizontal carousel */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-2 px-2">
              {catalogPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(i)}
                  className="snap-start shrink-0 group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none"
                  style={{ width: "240px", height: "240px" }}
                  data-testid={`img-landing-catalog-${photo.id}`}
                >
                  <img src={`/api/users/${userId}/catalog/${photo.id}/image`} alt={photo.caption || `Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-3">
                    {photo.caption && (
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-2 py-1 rounded-lg">
                        {photo.caption}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          MENU / PRODUCTOS
      ══════════════════════════════════════════ */}
      {showMenu && menuItems.length > 0 && (
        <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: `rgba(${accentRgb},0.07)` }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ backgroundColor: `rgba(${accentRgb},0.2)`, color: "#fff" }}>
                <ShoppingBag className="w-3.5 h-3.5" />
                PRODUCTOS & SERVICIOS
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: textColor }}>Lo que ofrecemos</h2>
              {menuData?.legend && (
                <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: textColor, opacity: 0.5 }}>{menuData.legend}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item: any) => {
                const qty = getQty(item.id);
                const accentColor = accent === "#1e293b" ? "#38bdf8" : accent;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
                    style={{
                      backgroundColor: `rgba(255,255,255,0.05)`,
                      border: qty > 0 ? `2px solid ${accentColor}` : `1px solid rgba(255,255,255,0.08)`,
                    }}
                    data-testid={`card-landing-menu-${item.id}`}
                  >
                    {item.imageData && (
                      <div
                        className="h-44 overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => setSelectedMenuItem(item)}
                        data-testid={`img-menu-item-${item.id}`}
                      >
                        <img src={item.imageData} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-base mb-1" style={{ color: textColor }}>{item.name}</h3>
                      {item.description && (
                        <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: textColor, opacity: 0.5 }}>{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xl font-black" style={{ color: accentColor }}>
                          ${item.price.toLocaleString('es-MX')}
                        </span>
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item.id)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all hover:opacity-80 active:scale-95"
                            style={{ backgroundColor: accentColor, color: "#fff" }}
                            data-testid={`button-add-to-cart-${item.id}`}
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95 font-bold"
                              style={{ backgroundColor: `rgba(255,255,255,0.15)`, color: "#fff" }}
                              data-testid={`button-remove-from-cart-${item.id}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-white font-bold text-sm w-6 text-center">{qty}</span>
                            <button
                              onClick={() => addToCart(item.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95 font-bold"
                              style={{ backgroundColor: accentColor, color: "#fff" }}
                              data-testid={`button-add-more-${item.id}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {qty > 0 && (
                        <p className="text-xs mt-2 font-semibold" style={{ color: accentColor }}>
                          Subtotal: ${(item.price * qty).toLocaleString('es-MX')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart summary */}
            {cartCount > 0 && menuData?.whatsappPhone && (
              <div className="mt-8 rounded-2xl p-5" style={{ backgroundColor: `rgba(255,255,255,0.08)`, border: `1px solid rgba(255,255,255,0.15)` }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base flex items-center gap-2" style={{ color: textColor }}>
                    <ShoppingCart className="w-4 h-4" /> Tu pedido
                    <span className="text-xs font-normal" style={{ color: textColor, opacity: 0.5 }}>({cartCount} {cartCount === 1 ? 'producto' : 'productos'})</span>
                  </h3>
                  <button onClick={clearCart} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors" data-testid="button-clear-cart">
                    <Trash2 className="w-3 h-3" /> Vaciar
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: textColor, opacity: 0.8 }}>{item.name} <span style={{ color: textColor, opacity: 0.4 }}>×{cart[item.id]}</span></span>
                      <span className="font-semibold" style={{ color: textColor }}>${(item.price * cart[item.id]).toLocaleString('es-MX')}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between mb-4">
                  <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>Total</span>
                  <span className="font-black text-lg" style={{ color: textColor }}>${cartTotal.toLocaleString('es-MX')}</span>
                </div>
                <a
                  href={`https://wa.me/${menuData.whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(buildOrderMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid="link-send-order"
                >
                  <button
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#25D366", color: "#fff" }}
                  >
                    <SiWhatsapp className="w-5 h-5" />
                    Enviar pedido por WhatsApp
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </a>
              </div>
            )}

            {cartCount === 0 && menuData?.whatsappPhone && (
              <p className="text-center text-sm mt-6" style={{ color: textColor, opacity: 0.3 }}>Agrega productos para armar tu pedido</p>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          MENU ITEM DETAIL POPUP
      ══════════════════════════════════════════ */}
      <Dialog open={!!selectedMenuItem} onOpenChange={open => { if (!open) setSelectedMenuItem(null); }}>
        <DialogContent
          className="max-w-sm sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl"
          style={{ backgroundColor: containerColor }}
          data-testid="dialog-menu-item-detail"
        >
          {selectedMenuItem && (() => {
            const accentColor = accent === "#1e293b" ? "#38bdf8" : accent;
            const qty = getQty(selectedMenuItem.id);
            return (
              <>
                {selectedMenuItem.imageData && (
                  <div className="w-full h-56 overflow-hidden">
                    <img
                      src={selectedMenuItem.imageData}
                      alt={selectedMenuItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col gap-3">
                  <div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: textColor }}>{selectedMenuItem.name}</h3>
                    <span className="text-2xl font-black" style={{ color: accentColor }}>
                      ${selectedMenuItem.price.toLocaleString('es-MX')}
                    </span>
                  </div>
                  {selectedMenuItem.description && (
                    <p className="text-sm leading-relaxed" style={{ color: textColor, opacity: 0.75 }}>
                      {selectedMenuItem.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    {qty === 0 ? (
                      <button
                        onClick={() => { addToCart(selectedMenuItem.id); setSelectedMenuItem(null); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-80 active:scale-95"
                        style={{ backgroundColor: accentColor, color: "#fff" }}
                        data-testid="button-popup-add-to-cart"
                      >
                        <Plus className="w-4 h-4" /> Agregar al pedido
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeFromCart(selectedMenuItem.id)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all hover:opacity-80 active:scale-95"
                          style={{ backgroundColor: `rgba(255,255,255,0.15)`, color: "#fff" }}
                          data-testid="button-popup-remove-from-cart"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-base w-6 text-center" style={{ color: textColor }}>{qty}</span>
                        <button
                          onClick={() => addToCart(selectedMenuItem.id)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all hover:opacity-80 active:scale-95"
                          style={{ backgroundColor: accentColor, color: "#fff" }}
                          data-testid="button-popup-add-more"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold ml-2" style={{ color: accentColor }}>
                          ${(selectedMenuItem.price * qty).toLocaleString('es-MX')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          BOOKING / RESERVAS
      ══════════════════════════════════════════ */}
      {showBooking && (
        <section id="reservar" className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ backgroundColor: `rgba(${accentRgb},0.2)`, color: "#fff" }}>
                <CalendarCheck className="w-3.5 h-3.5" />
                AGENDA TU CITA
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: textColor }}>Reserva en segundos</h2>
              <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>Elige el día y horario que mejor te convenga</p>
            </div>

            <div
              className="rounded-3xl p-6 sm:p-8"
              style={{ backgroundColor: `rgba(255,255,255,0.05)`, border: `1px solid rgba(255,255,255,0.08)` }}
            >
              {/* Week navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setSelectedDate(prev => addDays(prev, -7))}
                  className="p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/60 hover:text-white"
                  data-testid="button-landing-prev-week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="font-semibold capitalize text-sm sm:text-base" style={{ color: textColor }}>
                    {format(weekStart, "d 'de' MMMM", { locale: es })} – {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(prev => addDays(prev, 7))}
                  className="p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/60 hover:text-white"
                  data-testid="button-landing-next-week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekDays.map((day) => {
                  const now     = new Date();
                  const slots   = getSlotsForDay(day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
                  const isDayPast = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const free    = slots.filter(s => !s.isBreak && !s.isBooked && !isDayPast && s.start > now);
                  return (
                    <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                      {/* Day header */}
                      <div className={cn(
                        "w-full text-center rounded-xl py-1.5 px-0.5 text-xs font-bold mb-0.5",
                        isToday
                          ? "text-white ring-2 ring-white/30"
                          : "text-white/40",
                      )}
                        style={isToday ? { backgroundColor: `rgba(${accentRgb},0.4)` } : {}}
                      >
                        <div className="uppercase tracking-wider text-[10px]">{DAYS_SHORT[day.getDay()]}</div>
                        <div className="text-sm sm:text-base font-black">{format(day, 'd')}</div>
                      </div>

                      {/* Slots */}
                      <div className="w-full flex flex-col gap-0.5">
                        {slots.length === 0 ? (
                          <div className="h-7 flex items-center justify-center">
                            <span className="text-white/15 text-[10px]">—</span>
                          </div>
                        ) : (
                          slots.map((slot, idx) => {
                            const isSlotPast = isDayPast || slot.start <= now;
                            const isDisabled = slot.isBreak || slot.isBooked || isSlotPast;
                            return (
                            <button
                              key={idx}
                              onClick={() => !isDisabled && handleSlotClick(slot)}
                              disabled={isDisabled}
                              className={cn(
                                "w-full text-[10px] sm:text-xs py-1 rounded-lg font-bold transition-all duration-150",
                                slot.isBreak
                                  ? "opacity-30 cursor-not-allowed text-orange-300 bg-orange-900/20"
                                  : slot.isBooked
                                  ? "opacity-20 cursor-not-allowed text-white/40 bg-white/5 line-through"
                                  : isSlotPast
                                  ? "opacity-20 cursor-not-allowed text-white/30"
                                  : "text-white cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95"
                              )}
                              style={!isDisabled
                                ? { backgroundColor: `rgba(${accentRgb},0.5)`, border: `1px solid rgba(${accentRgb},0.4)` }
                                : undefined
                              }
                              data-testid={`slot-landing-${format(day, 'yyyy-MM-dd')}-${idx}`}
                            >
                              {format(slot.start, 'H:mm')}
                            </button>
                            );
                          })
                        )}
                      </div>

                      {free.length > 0 && (
                        <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#34d399" }}>
                          {free.length} libre{free.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Booking CTA hint */}
              <p className="text-center text-xs mt-6 flex items-center justify-center gap-1.5" style={{ color: textColor, opacity: 0.3 }}>
                <Clock className="w-3.5 h-3.5" />
                Cada cita dura 30 minutos · Toca un horario disponible para reservar
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          FINAL CTA SECTION
      ══════════════════════════════════════════ */}
      <section
        className="py-16 px-4 sm:px-6 text-center"
        style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.2) 0%, transparent 100%)` }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: textColor }}>
            ¿Listo para empezar?
          </h2>
          <p className="mb-8 text-lg" style={{ color: textColor, opacity: 0.5 }}>
            Contáctanos ahora y te ayudamos a dar el siguiente paso.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <button
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-2xl hover:-translate-y-1"
                  style={{ backgroundColor: "#25D366", color: "#fff" }}
                  data-testid="link-landing-whatsapp-cta"
                >
                  <SiWhatsapp className="w-5 h-5" />
                  Contáctanos ahora
                </button>
              </a>
            )}
            {showBooking && (
              <a href="#reservar">
                <button
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-1 border border-white/20 hover:bg-white/10"
                  style={{ color: "#fff" }}
                >
                  <CalendarCheck className="w-5 h-5" />
                  Ver disponibilidad
                </button>
              </a>
            )}
            {googleMapsUrl && (
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <button
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-2xl hover:-translate-y-1"
                  style={{ backgroundColor: "#EA4335", color: "#fff" }}
                  data-testid="link-landing-maps-cta"
                >
                  <MapPin className="w-5 h-5" />
                  Cómo llegar
                </button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 px-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-xs" style={{ color: textColor, opacity: 0.2 }}>© {new Date().getFullYear()} {companyName} · Página creada con migestion.pro</p>
      </footer>

      {/* ══════════════════════════════════════════
          BOOKING MODAL
      ══════════════════════════════════════════ */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) { setIsModalOpen(false); setBookingSuccess(false); } }}>
        <DialogContent className="sm:max-w-md">
          {bookingSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <DialogTitle className="text-xl font-black mb-2">¡Reserva confirmada!</DialogTitle>
              <p className="text-muted-foreground text-sm mb-1">
                {selectedSlot && format(selectedSlot.start, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-muted-foreground text-sm font-semibold mb-6">
                {selectedSlot && `${format(selectedSlot.start, 'H:mm')} – ${format(selectedSlot.end, 'H:mm')}`}
              </p>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block mb-3">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white gap-2">
                    <SiWhatsapp className="w-4 h-4" /> Confirmar por WhatsApp
                  </Button>
                </a>
              )}
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setBookingSuccess(false); }}>Cerrar</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Confirmar reserva</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 font-medium text-foreground/80 mt-1">
                  <Clock className="w-4 h-4 text-primary" />
                  {selectedSlot && (
                    <>
                      {format(selectedSlot.start, "EEEE d 'de' MMMM", { locale: es })} · {format(selectedSlot.start, 'H:mm')} – {format(selectedSlot.end, 'H:mm')}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="lp-name" className="text-sm font-semibold">Nombre completo *</Label>
                  <Input
                    id="lp-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Tu nombre"
                    className="mt-1"
                    data-testid="input-landing-booking-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lp-phone" className="text-sm font-semibold">Teléfono</Label>
                  <Input
                    id="lp-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(55) 1234-5678"
                    className="mt-1"
                    data-testid="input-landing-booking-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="lp-notes" className="text-sm font-semibold">Notas adicionales</Label>
                  <Textarea
                    id="lp-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="¿Algo que debamos saber? (opcional)"
                    rows={2}
                    className="mt-1 resize-none"
                    data-testid="input-landing-booking-notes"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createBooking.isPending} className="gap-1.5" data-testid="button-landing-confirm-booking">
                  {createBooking.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Reservando...</>
                    : <><CalendarCheck className="w-4 h-4" />Confirmar cita</>
                  }
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && catalogPhotos[lightboxIndex] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors" onClick={() => setLightboxIndex(null)}>
            <X className="w-5 h-5" />
          </button>
          {lightboxIndex > 0 && (
            <button className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i - 1 : null); }}>
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {lightboxIndex < catalogPhotos.length - 1 && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i + 1 : null); }}>
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          <div className="max-w-4xl max-h-[88vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={`/api/users/${userId}/catalog/${catalogPhotos[lightboxIndex].id}/image`}
              alt={catalogPhotos[lightboxIndex].caption || `Foto ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            {catalogPhotos[lightboxIndex].caption && (
              <p className="text-white/60 text-sm">{catalogPhotos[lightboxIndex].caption}</p>
            )}
            <p className="text-white/30 text-xs">{lightboxIndex + 1} / {catalogPhotos.length}</p>
          </div>
        </div>
      )}

      {/* PWA install button — uses user's logo and opens directly to this landing page */}
      <LandingPWAInstall
        userId={userId}
        businessName={companyName}
        logoUrl={companyLogo}
        bgColor={bgColor}
      />
    </div>
  );
}
