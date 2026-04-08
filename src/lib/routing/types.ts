import type {
  BlankInventoryItem,
  MerchantOrder,
  ProviderCapability,
  ProviderProfile,
  ProviderQualityMetrics,
} from "@/types";

export type RoutingFactor =
  | "printMethodCompatibility"
  | "garmentCompatibility"
  | "blankAvailability"
  | "providerVerificationTier"
  | "providerQuality"
  | "turnaroundSla"
  | "providerCapacity"
  | "proximity"
  | "shippingCost"
  | "localPickupPreference"
  | "merchantFulfillmentGoal";

export type RoutingWeights = Record<RoutingFactor, number>;

export type RoutingInput = {
  order: MerchantOrder;
  providers: ProviderProfile[];
  capabilities: ProviderCapability[];
  blankInventory: BlankInventoryItem[];
  qualityMetrics: ProviderQualityMetrics[];
};

export type RoutingFactorBreakdown = Record<
  RoutingFactor,
  {
    score: number;
    weight: number;
    weightedScore: number;
    note: string;
  }
>;

export type RoutingOperationalNotes = {
  estimatedDistanceMiles: number;
  estimatedShippingCostUsd: number;
  estimatedTurnaroundDays: number;
  availableCapacityUnits: number;
  requestedUnits: number;
  localPickupSupported: boolean;
};

export type ProviderRecommendation = {
  providerId: string;
  providerName: string;
  totalScore: number;
  factorBreakdown: RoutingFactorBreakdown;
  explanation: string;
  operationalNotes: RoutingOperationalNotes;
};

export type ScoreProviderInput = RoutingInput & {
  provider: ProviderProfile;
};
