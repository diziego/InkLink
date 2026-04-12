import { getCachedDistanceMiles } from "@/lib/geo/distance";
import type {
  BlankInventoryItem,
  MerchantOrder,
  OrderItem,
  ProviderProfile,
} from "@/types";

const MOCK_ZIP_DISTANCE_MILES: Record<string, Record<string, number>> = {
  "90401": {
    "90026": 18,
    "90802": 29,
    "92701": 43,
    "92113": 126,
    "92501": 71,
  },
  "91103": {
    "90026": 12,
    "90802": 36,
    "92701": 39,
    "92113": 123,
    "92501": 60,
  },
  "90802": {
    "90026": 31,
    "90802": 3,
    "92701": 21,
    "92113": 100,
    "92501": 62,
  },
};

export type BlankAvailabilityResult = {
  score: number;
  matchedItems: number;
  totalItems: number;
  note: string;
};

export type CapacityFitResult = {
  score: number;
  requestedUnits: number;
  availableCapacityUnits: number;
  note: string;
};

export function estimateMockDistanceMiles(
  fulfillmentZip: string,
  providerZip: string,
) {
  // Check real geocoded distance cache first (populated by precomputeDistances)
  const real = getCachedDistanceMiles(fulfillmentZip, providerZip);
  if (real !== null) return real;

  // Fall back to mock lookup table if geocoding was unavailable
  return (
    MOCK_ZIP_DISTANCE_MILES[fulfillmentZip]?.[providerZip] ??
    MOCK_ZIP_DISTANCE_MILES[providerZip]?.[fulfillmentZip] ??
    90
  );
}

// Mock MVP calculation only. Replace with carrier or courier quotes later.
export function estimateMockShippingCostUsd(distanceMiles: number) {
  const baseCost = 8;
  const distanceCost = distanceMiles * 0.18;

  return roundToTwo(baseCost + distanceCost);
}

// Mock MVP calculation only. Uses daily capacity as a deterministic proxy.
export function calculateMockCapacityFit(
  order: MerchantOrder,
  provider: ProviderProfile,
): CapacityFitResult {
  const requestedUnits = getOrderQuantity(order);
  const availableCapacityUnits = Math.max(
    provider.dailyCapacityUnits - provider.currentCapacityUsed,
    0,
  );
  const ratio = requestedUnits === 0 ? 1 : availableCapacityUnits / requestedUnits;
  const score = clampScore(ratio >= 1 ? 100 : ratio * 100);
  const note =
    availableCapacityUnits >= requestedUnits
      ? `${availableCapacityUnits} units available for ${requestedUnits} requested.`
      : `${availableCapacityUnits} units available for ${requestedUnits} requested. Capacity is tight.`;

  return {
    score,
    requestedUnits,
    availableCapacityUnits,
    note,
  };
}

// Mock MVP calculation only. Replace with supplier and live inventory checks later.
export function calculateMockBlankAvailabilityFit(
  order: MerchantOrder,
  providerInventory: BlankInventoryItem[],
): BlankAvailabilityResult {
  const itemScores = order.items.map((item) =>
    scoreBlankAvailabilityForItem(item, providerInventory),
  );
  const matchedItems = itemScores.filter((itemScore) => itemScore >= 70).length;
  const score =
    itemScores.length === 0
      ? 0
      : itemScores.reduce((total, itemScore) => total + itemScore, 0) /
        itemScores.length;

  return {
    score: clampScore(score),
    matchedItems,
    totalItems: order.items.length,
    note: `${matchedItems} of ${order.items.length} order items have a credible blank match.`,
  };
}

export function getOrderQuantity(order: MerchantOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function scoreBlankAvailabilityForItem(
  item: OrderItem,
  providerInventory: BlankInventoryItem[],
): number {
  const garmentMatches = providerInventory.filter(
    (blank) => blank.garmentType === item.garmentType,
  );

  if (garmentMatches.length === 0) {
    return 0;
  }

  const exactStyleMatch = garmentMatches.find(
    (blank) =>
      blank.blankBrand === item.preferredBlankBrand &&
      blank.styleName === item.preferredBlankStyle &&
      blank.stockStatus !== "out_of_stock" &&
      blank.quantityOnHand >= item.quantity,
  );

  if (exactStyleMatch) {
    return exactStyleMatch.isPremiumBlank ? 100 : 90;
  }

  const brandMatch = garmentMatches.find(
    (blank) =>
      blank.blankBrand === item.preferredBlankBrand &&
      blank.stockStatus !== "out_of_stock" &&
      blank.quantityOnHand >= item.quantity,
  );

  if (brandMatch) {
    return brandMatch.isPremiumBlank ? 85 : 75;
  }

  const inStockGarmentMatch = garmentMatches.find(
    (blank) => blank.stockStatus === "in_stock" && blank.quantityOnHand >= item.quantity,
  );

  if (inStockGarmentMatch) {
    return inStockGarmentMatch.isPremiumBlank ? 70 : 60;
  }

  const limitedMatch = garmentMatches.find(
    (blank) =>
      blank.stockStatus === "limited" && blank.quantityOnHand >= item.quantity,
  );

  return limitedMatch ? 50 : 25;
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}
