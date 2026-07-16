import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

interface DateRange {
  start?: string;
  end?: string;
}

export function useAppointments(range?: DateRange) {
  return useQuery({
    queryKey: [api.appointments.list.path, range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range?.start) params.append("start", range.start);
      if (range?.end) params.append("end", range.end);
      const url = `${api.appointments.list.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener citas");
      const data = await res.json();
      return data.map((apt: any) => ({
        ...apt,
        startTime: new Date(apt.startTime),
        endTime: new Date(apt.endTime),
        createdAt: apt.createdAt ? new Date(apt.createdAt) : null,
      }));
    },
  });
}

export function usePublicAppointments(userId: string | number, range?: DateRange) {
  return useQuery({
    queryKey: ['/api/users', userId, 'appointments', range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range?.start) params.append("start", range.start);
      if (range?.end) params.append("end", range.end);
      const url = `${buildUrl(api.public.userAppointments.path, { userId })}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener citas");
      const data = await res.json();
      return data.map((apt: any) => ({
        ...apt,
        startTime: new Date(apt.startTime),
        endTime: new Date(apt.endTime),
        createdAt: apt.createdAt ? new Date(apt.createdAt) : null,
      }));
    },
  });
}

export function useCreatePublicAppointment(userId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.public.createBooking.path, { userId });
      const payload = {
        ...data,
        startTime: data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime,
        endTime: data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear la cita");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'appointments'] });
      toast({
        title: "¡Reserva Confirmada!",
        description: "Tu cita ha sido agendada exitosamente.",
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error) => {
      toast({ title: "Error en la Reserva", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        startTime: data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime,
        endTime: data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime,
      };
      const res = await fetch(api.appointments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear la cita");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({
        title: "¡Reserva Confirmada!",
        description: "Tu cita ha sido agendada exitosamente.",
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error) => {
      toast({ title: "Error en la Reserva", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.appointments.update.path, { id });
      const payload = { ...updates };
      if (payload.startTime instanceof Date) payload.startTime = payload.startTime.toISOString();
      if (payload.endTime instanceof Date) payload.endTime = payload.endTime.toISOString();
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al actualizar la cita");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Cita Actualizada", description: "Los cambios han sido guardados." });
    },
    onError: (error) => {
      toast({ title: "Error al Actualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.appointments.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error al cancelar la cita");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Cita Cancelada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
