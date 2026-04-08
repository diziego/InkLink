import {
  mockBlankInventory,
  mockMerchantOrders,
  mockProviderCapabilities,
  mockProviderQualityMetrics,
  mockProviders,
} from "@/lib/mock-data";
import type { MerchantOrder } from "@/types";
import { scoreProviderForOrder } from "./score-provider";
import type { ProviderRecommendation, RoutingInput } from "./types";

export function recommendProvidersForOrder(
  input: RoutingInput,
): ProviderRecommendation[] {
  return input.providers
    .map((provider) =>
      scoreProviderForOrder({
        ...input,
        provider,
      }),
    )
    .sort(sortRecommendations);
}

export function recommendMockProvidersForOrder(
  order: MerchantOrder,
): ProviderRecommendation[] {
  return recommendProvidersForOrder({
    order,
    providers: mockProviders,
    capabilities: mockProviderCapabilities,
    blankInventory: mockBlankInventory,
    qualityMetrics: mockProviderQualityMetrics,
  });
}

export function recommendMockProvidersForOrderId(orderId: string) {
  const order = mockMerchantOrders.find((candidate) => candidate.id === orderId);

  if (!order) {
    return [];
  }

  return recommendMockProvidersForOrder(order);
}

function sortRecommendations(
  first: ProviderRecommendation,
  second: ProviderRecommendation,
) {
  if (second.totalScore !== first.totalScore) {
    return second.totalScore - first.totalScore;
  }

  if (
    first.operationalNotes.estimatedTurnaroundDays !==
    second.operationalNotes.estimatedTurnaroundDays
  ) {
    return (
      first.operationalNotes.estimatedTurnaroundDays -
      second.operationalNotes.estimatedTurnaroundDays
    );
  }

  return (
    first.operationalNotes.estimatedShippingCostUsd -
    second.operationalNotes.estimatedShippingCostUsd
  );
}
