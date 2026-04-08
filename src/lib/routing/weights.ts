import type { RoutingWeights } from "./types";

export const ROUTING_WEIGHTS = {
  printMethodCompatibility: 18,
  garmentCompatibility: 14,
  blankAvailability: 14,
  providerVerificationTier: 10,
  providerQuality: 12,
  turnaroundSla: 8,
  providerCapacity: 8,
  proximity: 6,
  shippingCost: 4,
  localPickupPreference: 3,
  merchantFulfillmentGoal: 3,
} satisfies RoutingWeights;

export const MAX_TOTAL_WEIGHT = Object.values(ROUTING_WEIGHTS).reduce(
  (total, weight) => total + weight,
  0,
);
