import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — Stripe features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const PLANS = {
  monthly: {
    name: "Mensual",
    description: "1 mes de membresía",
    interval: "month" as const,
    intervalCount: 1,
    price: 30000,
    priceId: "price_1TC3sLCkZo6q4UGkoRouKLIT",
    paymentLink: "https://buy.stripe.com/7sYfZgbyNdMV8kmbUL6oo02",
  },
  semiannual: {
    name: "Semestral",
    description: "Seis meses de servicio",
    interval: "month" as const,
    intervalCount: 6,
    price: 150000,
    priceId: "price_1TC3teCkZo6q4UGkRyx9LcZo",
    paymentLink: "https://buy.stripe.com/4gM8wOeKZbEN4462kb6oo00",
  },
  annual: {
    name: "Anual",
    description: "Tu servicio por todo el año",
    interval: "year" as const,
    intervalCount: 1,
    price: 300000,
    priceId: "price_1TC3uXCkZo6q4UGkGoj3lrI1",
    paymentLink: "https://buy.stripe.com/6oU28q9qF5gpcACgb16oo01",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPriceIds(): Record<PlanKey, string> {
  return {
    monthly: PLANS.monthly.priceId,
    semiannual: PLANS.semiannual.priceId,
    annual: PLANS.annual.priceId,
  };
}
