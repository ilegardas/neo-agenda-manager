import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAvailabilityRules() {
  return useQuery({
    queryKey: [api.availability.list.path],
    queryFn: async () => {
      const res = await fetch(api.availability.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener reglas de disponibilidad");
      return res.json();
    },
  });
}

export function usePublicAvailabilityRules(userId: string | number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'availability'],
    queryFn: async () => {
      const url = buildUrl(api.public.userAvailability.path, { userId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener disponibilidad");
      return res.json();
    },
  });
}

export function useCreateAvailabilityRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.availability.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear regla");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.availability.list.path] });
      toast({ title: "Regla Creada", description: "La regla de disponibilidad ha sido agregada." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAvailabilityRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.availability.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error al eliminar regla");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.availability.list.path] });
      toast({ title: "Regla Eliminada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
