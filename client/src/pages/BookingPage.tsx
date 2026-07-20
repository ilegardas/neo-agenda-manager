import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, addMinutes, isSameDay, isBefore, startOfDay, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { usePublicAvailabilityRules } from "@/hooks/use-availability";
import { usePublicAppointments, useCreatePublicAppointment } from "@/hooks/use-appointments";
import { usePublicSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Lock, Loader2, CalendarClock, CheckCircle, Eye, CreditCard } from "lucide-react";
import { SiWhatsapp, SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { buildUrl, api } from "@shared/routes";
import { usePublicSubscriptionStatus } from "@/hooks/use-subscription";
import { useUser } from "@/hooks/use-auth";

interface BookingPageProps {
  userId: string;
}

export default function BookingPage({ userId }: BookingPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });

  const { data: currentUser } = useUser();
  const isOwner = !!currentUser && currentUser.id === userId;

  let isPagePublic: boolean | undefined;
  let isPreview: boolean = false;

  const { data: userInfo } = useQuery({
    queryKey: ['/api/users', userId, 'info'],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userInfo.path, { userId }));
      if (!res.ok) throw new Error("Usuario no encontrado");
      return res.json() as Promise<{ id: string; name: string; email: string }>;
    },
  });

  const { data: subStatus, isLoading: subLoading } = usePublicSubscriptionStatus(userId);

  const { data: rules = [] } = usePublicAvailabilityRules(userId);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const { data: appointments = [] } = usePublicAppointments(userId, {
    start: weekStart.toISOString(),
    end: weekEnd.toISOString()
  });

  const { data: settingsData } = usePublicSettings(userId);
  const createBooking = useCreatePublicAppointment(userId);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getSlotsForDay = (day: Date) => {
    const dayIndex = day.getDay();
    const dayRules = rules.filter((r: any) => r.dayOfWeek === dayIndex);
    const availableRules = dayRules.filter((r: any) => !r.isBreak).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    const breakRules = dayRules.filter((r: any) => r.isBreak);

    const breakRanges = breakRules.map((br: any) => {
      const [sh, sm] = br.startTime.split(':').map(Number);
      const [eh, em] = br.endTime.split(':').map(Number);
      return {
        start: setMinutes(setHours(day, sh), sm),
        end: setMinutes(setHours(day, eh), em),
        label: br.label || undefined,
      };
    });

    const slots: Array<{ start: Date; end: Date; isBreak: boolean; isBooked: boolean; bookedBy?: string }> = [];

    availableRules.forEach((rule: any) => {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      let current = setMinutes(setHours(day, startH), startM);
      const end = setMinutes(setHours(day, endH), endM);

      while (current < end) {
        const slotEnd = addMinutes(current, 30);
        if (slotEnd > end) break;
        const overlappingBreak = breakRanges.find((br: any) => br.start < slotEnd && br.end > current);
        const bookedApt = appointments.find((apt: any) => {
          return apt.startTime < slotEnd && apt.endTime > current && apt.status !== 'cancelled';
        });

        slots.push({
          start: current,
          end: slotEnd,
          isBreak: !!overlappingBreak,
          isBooked: !!bookedApt,
          bookedBy: bookedApt?.customerName,
        });
        current = slotEnd;
      }
    });

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleSlotClick = (slot: any) => {
    if (slot.isBreak || slot.isBooked || isPreview) return;
    setSelectedSlot(slot);
    setBookingSuccess(false);
    setFormData({ name: "", phone: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    createBooking.mutate(
      {
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        customerName: formData.name,
        customerPhone: formData.phone,
        notes: formData.notes,
        status: 'booked',
      },
      { onSuccess: () => setBookingSuccess(true) }
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setBookingSuccess(false);
    setFormData({ name: "", phone: "", notes: "" });
  };

  const getWhatsAppUrl = () => {
    const phone = settingsData?.whatsapp_phone || "";
    const message = settingsData?.whatsapp_message || "";
    if (!phone) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  isPagePublic = subStatus?.active;
  isPreview = isOwner && !isPagePublic;

  if (!isPagePublic && !isOwner) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">Página No Disponible</h1>
          <p className="text-muted-foreground text-lg">
            Este enlace de reservas no está activo en este momento. El proveedor necesita activar su plan de suscripción.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {isPreview && (
        <div className="bg-amber-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Vista previa — Esta es tu página de reservas. Los visitantes ven esta página como privada hasta que actives una suscripción.</span>
          </div>
          <a
            href="/admin#subscription"
            onClick={(e) => { e.preventDefault(); window.location.href = "/admin"; }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
            data-testid="link-activate-subscription"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Activar suscripción
          </a>
        </div>
      )}
      <header className="bg-white border-b border-border sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settingsData?.profile_image ? (
              <img
                src={settingsData.profile_image}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-md"
                data-testid="img-provider-profile"
              />
            ) : (
              <div className="bg-primary/10 p-3 rounded-full">
                <Clock className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold font-display text-gray-900">
                {settingsData?.profile_name || userInfo?.name || "migestion.pro"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {(settingsData?.profile_description || settingsData?.social_facebook || settingsData?.social_instagram || settingsData?.social_tiktok || settingsData?.social_youtube || settingsData?.social_linkedin) && (
        <div className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2">
            {settingsData?.profile_description && (
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-profile-description">
                {settingsData.profile_description}
              </p>
            )}
            {(settingsData?.social_facebook || settingsData?.social_instagram || settingsData?.social_tiktok || settingsData?.social_youtube || settingsData?.social_linkedin) && (
              <div className="flex items-center gap-3 pt-1" data-testid="social-links">
                {settingsData.social_facebook && (
                  <a href={settingsData.social_facebook} target="_blank" rel="noopener noreferrer" data-testid="link-social-facebook" className="text-[#1877F2] hover:opacity-75 transition-opacity">
                    <SiFacebook className="w-5 h-5" />
                  </a>
                )}
                {settingsData.social_instagram && (
                  <a href={settingsData.social_instagram} target="_blank" rel="noopener noreferrer" data-testid="link-social-instagram" className="text-[#E1306C] hover:opacity-75 transition-opacity">
                    <SiInstagram className="w-5 h-5" />
                  </a>
                )}
                {settingsData.social_tiktok && (
                  <a href={settingsData.social_tiktok} target="_blank" rel="noopener noreferrer" data-testid="link-social-tiktok" className="text-black hover:opacity-75 transition-opacity">
                    <SiTiktok className="w-5 h-5" />
                  </a>
                )}
                {settingsData.social_youtube && (
                  <a href={settingsData.social_youtube} target="_blank" rel="noopener noreferrer" data-testid="link-social-youtube" className="text-[#FF0000] hover:opacity-75 transition-opacity">
                    <SiYoutube className="w-5 h-5" />
                  </a>
                )}
                {settingsData.social_linkedin && (
                  <a href={settingsData.social_linkedin} target="_blank" rel="noopener noreferrer" data-testid="link-social-linkedin" className="text-[#0A66C2] hover:opacity-75 transition-opacity">
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Selecciona un Horario</h2>
            <p className="text-muted-foreground mt-2 text-lg">Elige un horario conveniente para tu cita.</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-9 w-9 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-9 font-semibold w-48 justify-center rounded-lg hover:bg-gray-100">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM, yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-9 w-9 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()));
            const slots = getSlotsForDay(day);
            return (
              <div key={day.toISOString()} className={cn(
                "flex flex-col gap-3 min-w-[140px]",
                isToday ? "bg-primary/5 rounded-2xl p-2 -m-2 ring-1 ring-primary/20" : "",
                isPastDay ? "opacity-40 pointer-events-none select-none" : ""
              )}>
                <div className="text-center pb-2 border-b border-border/50">
                  <p className={cn("text-sm font-medium uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format(day, "EEE", { locale: es })}
                  </p>
                  <div className={cn(
                    "w-10 h-10 mx-auto mt-1 flex items-center justify-center rounded-full text-lg font-bold font-display",
                    isToday ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-gray-900"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="space-y-2">
                  {slots.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-xs text-muted-foreground italic bg-gray-50 rounded-lg border border-dashed">
                      Sin horarios
                    </div>
                  ) : (
                    slots.map((slot, idx) => {
                      const isPastSlot = !isPastDay && isBefore(slot.start, new Date());
                      const isDisabled = slot.isBreak || slot.isBooked || isPreview || isPastDay || isPastSlot;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isDisabled}
                          title={slot.isBooked && slot.bookedBy ? slot.bookedBy : isPreview ? "Vista previa — los clientes podrán reservar este horario" : undefined}
                          className={cn(
                            "w-full py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left flex items-center justify-between group relative overflow-hidden",
                            slot.isBooked
                              ? "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed opacity-60"
                              : slot.isBreak
                                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                                : isPastSlot
                                  ? "bg-gray-50 border-transparent text-gray-300 cursor-not-allowed opacity-50"
                                  : isPreview
                                    ? "bg-white border-border/50 text-gray-500 cursor-default opacity-75"
                                    : "bg-white border-border/50 hover:border-primary hover:shadow-md hover:shadow-primary/5 text-gray-700 hover:text-primary"
                          )}
                        >
                          <span className="relative z-10">{format(slot.start, "h:mm a")}</span>
                          {slot.isBooked && <Lock className="w-3.5 h-3.5" />}
                          {!isDisabled && !isPreview && (
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
          {bookingSuccess && selectedSlot ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">¡Reserva Confirmada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(selectedSlot.start, "EEEE d 'de' MMMM", { locale: es })} &bull; {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                {getWhatsAppUrl() && (
                  <a href={getWhatsAppUrl()!} target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp">
                    <Button className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-lg shadow-lg">
                      <SiWhatsapp className="w-5 h-5 mr-2" />
                      Ir a WhatsApp
                    </Button>
                  </a>
                )}
                <Button variant="outline" onClick={handleCloseModal} className="h-11 rounded-lg" data-testid="button-close-success">
                  Cerrar
                </Button>
              </div>
            </div>
          ) : selectedSlot ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <CalendarClock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-display">Confirmar Reserva</DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      {format(selectedSlot.start, "EEEE d 'de' MMMM", { locale: es })} &bull; {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground/80">Nombre Completo</Label>
                    <Input id="name" required placeholder="Juan Pérez" className="h-11 rounded-lg border-gray-200" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground/80">Teléfono</Label>
                    <Input id="phone" type="tel" placeholder="614 123 4567" className="h-11 rounded-lg border-gray-200" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium text-foreground/80">Notas (Opcional)</Label>
                    <Textarea id="notes" placeholder="¿Algún tema específico que quieras discutir?" className="min-h-[100px] resize-none rounded-lg border-gray-200" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="h-11 rounded-lg border-gray-200">Cancelar</Button>
                  <Button type="submit" disabled={createBooking.isPending} className="h-11 rounded-lg px-8 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                    {createBooking.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reservando...</>) : "Confirmar Cita"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
