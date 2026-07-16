import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useSettings } from "@/hooks/use-settings";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, CalendarClock, CheckCircle } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: { start: Date; end: Date } | null;
}

export function BookingModal({ isOpen, onClose, selectedSlot }: BookingModalProps) {
  const { mutate, isPending } = useCreateAppointment();
  const { data: settingsData } = useSettings();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: ""
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    mutate(
      {
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        customerName: formData.name,
        customerPhone: formData.phone,
        notes: formData.notes,
        status: 'booked'
      },
      {
        onSuccess: () => {
          setBookingSuccess(true);
        }
      }
    );
  };

  const handleClose = () => {
    setFormData({ name: "", phone: "", notes: "" });
    setBookingSuccess(false);
    onClose();
  };

  const getWhatsAppUrl = () => {
    const phone = settingsData?.whatsapp_phone || "";
    const message = settingsData?.whatsapp_message || "";
    if (!phone) return null;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  if (!selectedSlot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
        {bookingSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-gray-900">¡Cita Confirmada!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es })} • {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              {getWhatsAppUrl() && (
                <a
                  href={getWhatsAppUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-whatsapp"
                >
                  <Button className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-lg shadow-lg">
                    <SiWhatsapp className="w-5 h-5 mr-2" />
                    Ir a WhatsApp
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-11 rounded-lg"
                data-testid="button-close-success"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <CalendarClock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-display">Confirmar Reserva</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    {format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es })} • {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground/80">Nombre Completo</Label>
                  <Input
                    id="name"
                    required
                    placeholder="Juan Pérez"
                    className="h-11 rounded-lg border-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground/80">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="614 123 4567"
                    className="h-11 rounded-lg border-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-foreground/80">Notas (Opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="¿Algún tema específico que quieras discutir?"
                    className="min-h-[100px] resize-none rounded-lg border-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  className="h-11 rounded-lg border-gray-200 hover:bg-gray-50 hover:text-foreground font-medium"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="h-11 rounded-lg px-8 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reservando...
                    </>
                  ) : (
                    "Confirmar Cita"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
