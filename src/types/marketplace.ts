export type UserRole = "merchant" | "provider" | "admin";

export type PrintMethod =
  | "dtg"
  | "dtf"
  | "screen_print"
  | "embroidery"
  | "heat_transfer";

export type GarmentType =
  | "t_shirt"
  | "long_sleeve"
  | "hoodie"
  | "crewneck"
  | "tank"
  | "tote";

export type ProviderTier = "emerging" | "verified" | "preferred";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

export type BlankStockStatus = "in_stock" | "limited" | "out_of_stock";

export type FulfillmentGoal =
  | "local_first"
  | "fastest_turnaround"
  | "lowest_cost"
  | "premium_blank";

export type OrderStatus =
  | "draft"
  | "ready_for_routing"
  | "routed"
  | "provider_selected"
  | "paid"
  | "accepted"
  | "in_production"
  | "ready"
  | "shipped"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "checkout_pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type MerchantPaymentSummary = {
  id: string;
  status: PaymentStatus;
  amountCents: number;
  checkoutSessionId?: string | null;
  paidAt?: string | null;
};

export type MerchantProviderAssignmentSummary = {
  id: string;
  status: "pending" | "accepted" | "declined";
  assignedAt: string;
  respondedAt?: string | null;
};

export type Profile = {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  createdAt: string;
};

export type MerchantProfile = {
  id: string;
  profileId: string;
  businessName: string;
  city: string;
  state: "CA";
  zip: string;
  fulfillmentGoal: FulfillmentGoal;
  preferredBlankBrands: string[];
};

export type ProviderProfile = {
  id: string;
  profileId: string;
  businessName: string;
  legalBusinessName: string;
  dbaName?: string;
  contactName: string;
  businessEmail: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: "CA";
  zip: string;
  sellersPermitNumber: string;
  einPlaceholder: string;
  businessType: string;
  yearsInOperation: number;
  supplierAccountReadiness: string[];
  preferredBlankDistributors: string[];
  blankSourcingNotes: string;
  fulfillmentCutoffTime: string;
  reorderLeadTimeDays: number;
  serviceRadiusMiles: number;
  supportsLocalPickup: boolean;
  tier: ProviderTier;
  verificationStatus: VerificationStatus;
  turnaroundSlaDays: number;
  dailyCapacityUnits: number;
  currentCapacityUsed: number;
  specialties: string[];
};

export type ProviderCapability = {
  id: string;
  providerId: string;
  printMethods: PrintMethod[];
  garmentTypes: GarmentType[];
  maxOrderQuantity: number;
  acceptsPremiumBlanks: boolean;
  notes: string;
};

export type BlankInventoryItem = {
  id: string;
  providerId: string;
  blankBrand: string;
  styleName: string;
  garmentType: GarmentType;
  colors: string[];
  sizes: string[];
  stockStatus: BlankStockStatus;
  quantityOnHand: number;
  isPremiumBlank: boolean;
};

export type ProviderQualityMetrics = {
  providerId: string;
  qualityScore: number;
  reliabilityScore: number;
  reprintRate: number;
  onTimeDeliveryRate: number;
  averageRating: number;
  completedOrders: number;
  lastReviewedAt: string;
};

export type OrderItem = {
  id: string;
  printMethod: PrintMethod;
  garmentType: GarmentType;
  quantity: number;
  preferredBlankBrand?: string;
  preferredBlankStyle?: string;
  sizes: Partial<Record<"XS" | "S" | "M" | "L" | "XL" | "2XL", number>>;
  color: string;
};

export type MerchantOrder = {
  id: string;
  merchantId: string;
  status: OrderStatus;
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  localPickupPreferred: boolean;
  neededByDate: string;
  items: OrderItem[];
  notes: string;
  createdAt: string;
  updatedAt?: string;
  selectedProviderProfileId?: string | null;
  selectedRecommendationSnapshotId?: string | null;
  selectedEstimatedPriceCents?: number | null;
  paymentSummary?: MerchantPaymentSummary | null;
  providerAssignmentSummary?: MerchantProviderAssignmentSummary | null;
};
