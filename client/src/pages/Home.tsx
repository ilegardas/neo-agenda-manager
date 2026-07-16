import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, addMinutes, isSameDay, setHours, setMinutes, isWithinInterval, parseISO } from "date-fns";
import { useAvailabilityRules } from "@/hooks/use-availability";
import { useAppointments } from "@/hooks/use-appointments";
import { BookingModal } from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  // Fetch rules and appointments
  const { data: rules = [] } = useAvailabilityRules();
  
  // Calculate week range for fetching appointments
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday start
  const weekEnd = addDays(weekStart, 6);
  
  const { data: appointments = [], isLoading } = useAppointments({
    start: weekStart.toISOString(),
    end: weekEnd.toISOString()
  });

  // --- CALENDAR LOGIC ---
  // Generate 7 days for current week view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Generate slots for a specific day
  const getSlotsForDay = (day: Date) => {
    const dayIndex = day.getDay();
    const dayRules = rules.filter(r => r.dayOfWeek === dayIndex);

    const availableRules = dayRules.filter(r => !r.isBreak).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const breakRules = dayRules.filter(r => r.isBreak);

    const breakRanges = breakRules.map(br => {
      const [sh, sm] = br.startTime.split(':').map(Number);
      const [eh, em] = br.endTime.split(':').map(Number);
      return {
        start: setMinutes(setHours(day, sh), sm),
        end: setMinutes(setHours(day, eh), em),
        label: br.label || undefined,
      };
    });

    const slots: Array<{ start: Date; end: Date; isBreak: boolean; isBooked: boolean; label?: string; bookedBy?: string }> = [];

    availableRules.forEach(rule => {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);

      let current = setMinutes(setHours(day, startH), startM);
      const end = setMinutes(setHours(day, endH), endM);

      while (current < end) {
        const slotEnd = addMinutes(current, 30);
        if (slotEnd > end) break;

        const overlappingBreak = breakRanges.find(br => br.start < slotEnd && br.end > current);

        const bookedApt = appointments.find(apt => {
          return apt.startTime < slotEnd && apt.endTime > current && apt.status !== 'cancelled';
        });

        slots.push({
          start: current,
          end: slotEnd,
          isBreak: !!overlappingBreak,
          isBooked: !!bookedApt,
          bookedBy: bookedApt?.customerName,
          label: overlappingBreak ? overlappingBreak.label : (rule.label || undefined),
        });

        current = slotEnd;
      }
    });

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleSlotClick = (slot: any) => {
    if (slot.isBreak || slot.isBooked) return;
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display text-gray-900">BookFlow</h1>
          </div>
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Select a Time</h2>
            <p className="text-muted-foreground mt-2 text-lg">Choose a convenient slot for your appointment.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-9 w-9 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-9 font-semibold w-48 justify-center rounded-lg hover:bg-gray-100">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-9 w-9 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const slots = getSlotsForDay(day);

            return (
              <div key={day.toISOString()} className={cn(
                "flex flex-col gap-3 min-w-[140px]",
                isToday ? "bg-primary/5 rounded-2xl p-2 -m-2 ring-1 ring-primary/20" : ""
              )}>
                <div className="text-center pb-2 border-b border-border/50">
                  <p className={cn("text-sm font-medium uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format(day, "EEE")}
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
                      No slots
                    </div>
                  ) : (
                    slots.map((slot, idx) => {
                      const isDisabled = slot.isBreak || slot.isBooked;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isDisabled}
                          title={slot.isBooked && slot.bookedBy ? slot.bookedBy : undefined}
                          className={cn(
                            "w-full py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left flex items-center justify-between group relative overflow-hidden",
                            slot.isBooked 
                              ? "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed opacity-60" 
                              : slot.isBreak
                                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white border-border/50 hover:border-primary hover:shadow-md hover:shadow-primary/5 text-gray-700 hover:text-primary"
                          )}
                          data-testid={`slot-${format(slot.start, "HH-mm")}`}
                        >
                          <span className="relative z-10">{format(slot.start, "h:mm a")}</span>
                          
                          {slot.isBooked && <Lock className="w-3.5 h-3.5" />}
                          {!isDisabled && (
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

      <BookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
