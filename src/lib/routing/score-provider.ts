import type {
  FulfillmentGoal,
  ProviderCapability,
  ProviderQualityMetrics,
  ProviderTier,
  VerificationStatus,
} from "@/types";
import {
  calculateMockBlankAvailabilityFit,
  calculateMockCapacityFit,
  clampScore,
  estimateMockDistanceMiles,
  estimateMockShippingCostUsd,
  getOrderQuantity,
} from "./mock-calculations";
import type {
  ProviderRecommendation,
  RoutingFactor,
  RoutingFactorBreakdown,
  ScoreProviderInput,
} from "./types";
import { MAX_TOTAL_WEIGHT, ROUTING_WEIGHTS } from "./weights";

type FactorResult = {
  score: number;
  note: string;
};

export function scoreProviderForOrder({
  order,
  provider,
  capabilities,
  blankInventory,
  qualityMetrics,
}: ScoreProviderInput): ProviderRecommendation {
  const capability = capabilities.find(
    (candidate) => candidate.providerId === provider.id,
  );
  const metrics = qualityMetrics.find(
    (candidate) => candidate.providerId === provider.id,
  );
  const providerInventory = blankInventory.filter(
    (item) => item.providerId === provider.id,
  );
  const distanceMiles = estimateMockDistanceMiles(
    order.fulfillmentZip,
    provider.zip,
  );
  const shippingCostUsd = estimateMockShippingCostUsd(distanceMiles);
  const capacityFit = calculateMockCapacityFit(order, provider);
  const blankAvailability = calculateMockBlankAvailabilityFit(
    order,
    providerInventory,
  );

  const factors: Record<RoutingFactor, FactorResult> = {
    printMethodCompatibility: scorePrintMethodCompatibility(order, capability),
    garmentCompatibility: scoreGarmentCompatibility(order, capability),
    blankAvailability: {
      score: blankAvailability.score,
      note: blankAvailability.note,
    },
    providerVerificationTier: scoreVerificationTier(
      provider.verificationStatus,
      provider.tier,
    ),
    providerQuality: scoreProviderQuality(metrics),
    turnaroundSla: scoreTurnaroundSla(provider.turnaroundSlaDays),
    providerCapacity: {
      score: capacityFit.score,
      note: capacityFit.note,
    },
    proximity: scoreProximity(distanceMiles, provider.serviceRadiusMiles),
    shippingCost: scoreShippingCost(shippingCostUsd),
    localPickupPreference: scoreLocalPickupPreference(
      order.localPickupPreferred,
      provider.supportsLocalPickup,
    ),
    merchantFulfillmentGoal: scoreMerchantFulfillmentGoal({
      goal: order.fulfillmentGoal,
      capability,
      distanceMiles,
      shippingCostUsd,
      metrics,
      providerTier: provider.tier,
      turnaroundSlaDays: provider.turnaroundSlaDays,
      blankAvailabilityScore: blankAvailability.score,
    }),
  };
  const factorBreakdown = buildFactorBreakdown(factors);
  const totalScore = calculateTotalScore(factorBreakdown);

  return {
    providerId: provider.id,
    providerName: provider.businessName,
    totalScore,
    factorBreakdown,
    explanation: buildExplanation({
      providerName: provider.businessName,
      totalScore,
      distanceMiles,
      shippingCostUsd,
      turnaroundSlaDays: provider.turnaroundSlaDays,
      supportsLocalPickup: provider.supportsLocalPickup,
      capacityNote: capacityFit.note,
      blankAvailabilityNote: blankAvailability.note,
    }),
    operationalNotes: {
      estimatedDistanceMiles: distanceMiles,
      estimatedShippingCostUsd: shippingCostUsd,
      estimatedTurnaroundDays: provider.turnaroundSlaDays,
      availableCapacityUnits: capacityFit.availableCapacityUnits,
      requestedUnits: capacityFit.requestedUnits,
      localPickupSupported: provider.supportsLocalPickup,
    },
  };
}

function scorePrintMethodCompatibility(
  order: ScoreProviderInput["order"],
  capability?: ProviderCapability,
): FactorResult {
  if (!capability) {
    return { score: 0, note: "No provider capability profile is available." };
  }

  const requestedMethods = new Set(order.items.map((item) => item.printMethod));
  const supportedCount = [...requestedMethods].filter((method) =>
    capability.printMethods.includes(method),
  ).length;
  const score = (supportedCount / requestedMethods.size) * 100;

  return {
    score: clampScore(score),
    note: `${supportedCount} of ${requestedMethods.size} requested print methods are supported.`,
  };
}

function scoreGarmentCompatibility(
  order: ScoreProviderInput["order"],
  capability?: ProviderCapability,
): FactorResult {
  if (!capability) {
    return { score: 0, note: "No provider garment capability profile is available." };
  }

  const requestedGarments = new Set(order.items.map((item) => item.garmentType));
  const supportedCount = [...requestedGarments].filter((garmentType) =>
    capability.garmentTypes.includes(garmentType),
  ).length;
  const quantity = getOrderQuantity(order);
  const quantityFits = quantity <= capability.maxOrderQuantity;
  const compatibilityScore = (supportedCount / requestedGarments.size) * 100;
  const score = quantityFits ? compatibilityScore : compatibilityScore * 0.75;

  return {
    score: clampScore(score),
    note: `${supportedCount} of ${requestedGarments.size} garment types are supported; max order quantity is ${capability.maxOrderQuantity}.`,
  };
}

function scoreVerificationTier(
  verificationStatus: VerificationStatus,
  tier: ProviderTier,
): FactorResult {
  const statusScore = {
    verified: 80,
    pending: 45,
    not_submitted: 20,
    rejected: 0,
  } satisfies Record<VerificationStatus, number>;
  const tierBonus = {
    preferred: 20,
    verified: 12,
    emerging: 4,
  } satisfies Record<ProviderTier, number>;

  return {
    score: clampScore(statusScore[verificationStatus] + tierBonus[tier]),
    note: `Provider is ${verificationStatus} with ${tier} tier status.`,
  };
}

function scoreProviderQuality(
  metrics?: ProviderQualityMetrics,
): FactorResult {
  if (!metrics) {
    return { score: 0, note: "No provider quality metrics are available." };
  }

  const score =
    metrics.qualityScore * 0.45 +
    metrics.reliabilityScore * 0.35 +
    metrics.onTimeDeliveryRate * 100 * 0.15 +
    (1 - metrics.reprintRate) * 100 * 0.05;

  return {
    score: clampScore(score),
    note: `Quality ${metrics.qualityScore}, reliability ${metrics.reliabilityScore}, ${Math.round(metrics.onTimeDeliveryRate * 100)}% on-time delivery.`,
  };
}

function scoreTurnaroundSla(turnaroundSlaDays: number): FactorResult {
  const score = clampScore(110 - turnaroundSlaDays * 18);

  return {
    score,
    note: `${turnaroundSlaDays}-day standard turnaround SLA.`,
  };
}

function scoreProximity(
  distanceMiles: number,
  serviceRadiusMiles: number,
): FactorResult {
  const radiusFit = distanceMiles <= serviceRadiusMiles;
  const baseScore = radiusFit ? 100 - (distanceMiles / serviceRadiusMiles) * 35 : 45;

  return {
    score: clampScore(baseScore),
    note: `${distanceMiles} mocked miles from fulfillment ZIP; service radius is ${serviceRadiusMiles} miles.`,
  };
}

function scoreShippingCost(shippingCostUsd: number): FactorResult {
  const score = clampScore(100 - shippingCostUsd * 2.5);

  return {
    score,
    note: `$${shippingCostUsd.toFixed(2)} mocked shipping estimate.`,
  };
}

function scoreLocalPickupPreference(
  localPickupPreferred: boolean,
  supportsLocalPickup: boolean,
): FactorResult {
  if (!localPickupPreferred) {
    return {
      score: supportsLocalPickup ? 75 : 70,
      note: "Local pickup was not requested for this order.",
    };
  }

  return {
    score: supportsLocalPickup ? 100 : 25,
    note: supportsLocalPickup
      ? "Merchant prefers local pickup and provider supports it."
      : "Merchant prefers local pickup but provider does not support it.",
  };
}

function scoreMerchantFulfillmentGoal({
  goal,
  capability,
  distanceMiles,
  shippingCostUsd,
  metrics,
  providerTier,
  turnaroundSlaDays,
  blankAvailabilityScore,
}: {
  goal: FulfillmentGoal;
  capability?: ProviderCapability;
  distanceMiles: number;
  shippingCostUsd: number;
  metrics?: ProviderQualityMetrics;
  providerTier: ProviderTier;
  turnaroundSlaDays: number;
  blankAvailabilityScore: number;
}): FactorResult {
  if (goal === "local_first") {
    return {
      score: clampScore(100 - distanceMiles),
      note: "Merchant goal favors nearby fulfillment.",
    };
  }

  if (goal === "fastest_turnaround") {
    return {
      score: scoreTurnaroundSla(turnaroundSlaDays).score,
      note: "Merchant goal favors shorter turnaround.",
    };
  }

  if (goal === "lowest_cost") {
    return {
      score: scoreShippingCost(shippingCostUsd).score,
      note: "Merchant goal favors lower mocked shipping cost.",
    };
  }

  const premiumBlankScore =
    capability?.acceptsPremiumBlanks || providerTier === "preferred"
      ? Math.max(blankAvailabilityScore, metrics?.qualityScore ?? 0)
      : blankAvailabilityScore * 0.75;

  return {
    score: clampScore(premiumBlankScore),
    note: "Merchant goal favors premium blank fit and provider quality.",
  };
}

function buildFactorBreakdown(
  factors: Record<RoutingFactor, FactorResult>,
): RoutingFactorBreakdown {
  return Object.fromEntries(
    Object.entries(factors).map(([factor, result]) => {
      const routingFactor = factor as RoutingFactor;
      const weight = ROUTING_WEIGHTS[routingFactor];

      return [
        routingFactor,
        {
          score: result.score,
          weight,
          weightedScore: roundToTwo((result.score / 100) * weight),
          note: result.note,
        },
      ];
    }),
  ) as RoutingFactorBreakdown;
}

function calculateTotalScore(factorBreakdown: RoutingFactorBreakdown) {
  const weightedScore = Object.values(factorBreakdown).reduce(
    (total, factor) => total + factor.weightedScore,
    0,
  );

  return roundToTwo((weightedScore / MAX_TOTAL_WEIGHT) * 100);
}

function buildExplanation({
  providerName,
  totalScore,
  distanceMiles,
  shippingCostUsd,
  turnaroundSlaDays,
  supportsLocalPickup,
  capacityNote,
  blankAvailabilityNote,
}: {
  providerName: string;
  totalScore: number;
  distanceMiles: number;
  shippingCostUsd: number;
  turnaroundSlaDays: number;
  supportsLocalPickup: boolean;
  capacityNote: string;
  blankAvailabilityNote: string;
}) {
  return `${providerName} scored ${totalScore}/100 with a ${turnaroundSlaDays}-day SLA, ${distanceMiles} mocked miles of distance, and a $${shippingCostUsd.toFixed(2)} mocked shipping estimate. ${blankAvailabilityNote} ${capacityNote} Local pickup is ${
    supportsLocalPickup ? "supported" : "not supported"
  }.`;
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}
