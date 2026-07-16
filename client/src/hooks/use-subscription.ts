import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export interface SubscriptionStatus {
  status: string;
  plan: string;
  isAdmin?: boolean;
  currentPeriodEnd?: string;
  stripeSubscriptionId?: string;
}

export interface PlanInfo {
  key: string;
  name: string;
  price: number;
  interval: string;
  intervalCount: number;
}

export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: [api.subscription.status.path],
    queryFn: async () => {
      const res = await fetch(api.subscription.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener estado de suscripción");
      return res.json();
    },
  });
}

export function usePlans() {
  return useQuery<{ plans: PlanInfo[]; configured: boolean }>({
    queryKey: [api.subscription.plans.path],
    queryFn: async () => {
      const res = await fetch(api.subscription.plans.path);
      if (!res.ok) throw new Error("Error al obtener planes");
      return res.json();
    },
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", api.subscription.checkout.path, { plan });
      const data = await res.json();
      return data as { url: string };
    },
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", api.subscription.portal.path);
      const data = await res.json();
      return data as { url: string };
    },
  });
}

export function usePublicSubscriptionStatus(userId: string) {
  return useQuery<{ active: boolean }>({
    queryKey: ['/api/users', userId, 'subscription-status'],
    queryFn: async () => {
      const url = buildUrl(api.public.userSubscriptionStatus.path, { userId });
      const res = await fetch(url);
      if (!res.ok) return { active: false };
      return res.json();
    },
  });
}
