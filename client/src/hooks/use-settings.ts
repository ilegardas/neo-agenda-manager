import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener configuración");
      return res.json() as Promise<Record<string, string>>;
    },
  });
}

export function usePublicSettings(userId: string | number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'settings'],
    queryFn: async () => {
      const url = buildUrl(api.public.userSettings.path, { userId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener configuración");
      return res.json() as Promise<Record<string, string>>;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch(api.settings.update.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al actualizar configuración");
      return res.json() as Promise<Record<string, string>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Configuración Guardada", description: "Los cambios han sido guardados correctamente." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
