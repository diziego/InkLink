import type { GarmentType as MarketplaceGarmentType } from "@/types";

export type GarmentType = "tee" | "hoodie" | "tank" | "hat";

export type PrintArea = {
  name: string;
  widthIn: number;
  heightIn: number;
};

export type ColorSwatch = {
  name: string;
  hex: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string;
  garmentType: GarmentType;
  description: string;
  weightGsm: number;
  availableSizes: string[];
  availableColors: ColorSwatch[];
  printAreas: PrintArea[];
  priceRangeLow: number; // cents
  priceRangeHigh: number; // cents
};

/**
 * Maps catalog garment types to the marketplace routing engine's garment types.
 * "hat" has no direct routing equivalent; maps to "t_shirt" for MVP routing.
 */
export const CATALOG_TO_ROUTING_GARMENT: Record<GarmentType, MarketplaceGarmentType> = {
  tee: "t_shirt",
  hoodie: "hoodie",
  tank: "tank",
  hat: "t_shirt",
};

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  // ─── Tees ────────────────────────────────────────────────────────────────

  {
    id: "gildan-5000",
    name: "Heavy Cotton Tee",
    brand: "Gildan",
    sku: "5000",
    garmentType: "tee",
    description:
      "Classic heavyweight cotton tee built for durability and print consistency. Double-needle stitching throughout. The value staple for high-volume DTG runs.",
    weightGsm: 185,
    availableSizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1C1C1B" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Sport Grey", hex: "#A8A9AD" },
      { name: "Cardinal Red", hex: "#8E1A30" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 399,
    priceRangeHigh: 699,
  },

  {
    id: "bc-3001",
    name: "Unisex Jersey Tee",
    brand: "Bella+Canvas",
    sku: "3001",
    garmentType: "tee",
    description:
      "Retail-fit jersey with a soft hand feel ideal for vibrant DTG output. Side-seamed for a modern silhouette. Tear-away label. The premium blank benchmark.",
    weightGsm: 145,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Heather Grey", hex: "#B8B8B8" },
      { name: "Navy", hex: "#1E2C5C" },
      { name: "Cardinal", hex: "#8B1A2C" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 799,
    priceRangeHigh: 1299,
  },

  {
    id: "cc-1717",
    name: "Garment Dyed Tee",
    brand: "Comfort Colors",
    sku: "1717",
    garmentType: "tee",
    description:
      "Pigment-dyed ring-spun cotton with a broken-in, vintage feel. Relaxed fit. Each color has unique tonal variation that gives finished pieces a premium, lived-in look.",
    weightGsm: 185,
    availableSizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    availableColors: [
      { name: "Ivory", hex: "#F2EBD9" },
      { name: "Flo Blue", hex: "#5A9DB8" },
      { name: "Pepper", hex: "#3D3D3D" },
      { name: "Crimson", hex: "#9B1B30" },
      { name: "Chalky Mint", hex: "#A8C8B5" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 1099,
    priceRangeHigh: 1699,
  },

  {
    id: "gildan-hammer",
    name: "Hammer Tee",
    brand: "Gildan",
    sku: "H000",
    garmentType: "tee",
    description:
      "6 oz. 100% ring-spun US cotton with high stitch density for a smooth, premium printing surface. Classic fit with a seamless non-topstitched collar and tear-away label. The heavyweight step-up from the 5000.",
    weightGsm: 203,
    availableSizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Sport Grey", hex: "#A8A9AD" },
      { name: "Sand", hex: "#D4C5A9" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 599,
    priceRangeHigh: 999,
  },

  {
    id: "la-apparel-1801gd",
    name: "Garment Dye Heavyweight Tee",
    brand: "Los Angeles Apparel",
    sku: "1801GD",
    garmentType: "tee",
    description:
      "6.5 oz. 100% USA cotton, knitted, cut, sewn, and dyed in Los Angeles. Garment-dyed for a broken-in vintage hand-feel with a generous unisex fit and a high ribbed collar. The streetwear blank benchmark.",
    weightGsm: 220,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Vintage Black", hex: "#2A2A28" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Sage", hex: "#8A9E7E" },
      { name: "Mauve", hex: "#C4A0A0" },
      { name: "Light Blue", hex: "#A8C8D8" },
      { name: "Cement", hex: "#9B9B8B" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 1499,
    priceRangeHigh: 2299,
  },

  {
    id: "shaka-wear-shgd",
    name: "Max Heavyweight Garment Dye Tee",
    brand: "Shaka Wear",
    sku: "SHGD",
    garmentType: "tee",
    description:
      "7.5 oz. 100% USA cotton — the heaviest garment-dye tee in the industry. Pigment/reactive-washed for a vintage washed-out look. Oversized boxy fit with reinforced seams and a ribbed crew neck. Built for clean DTG printing.",
    weightGsm: 255,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Shadow", hex: "#3A3A3A" },
      { name: "Midnight Navy", hex: "#1A2440" },
      { name: "Moss", hex: "#3A4A30" },
      { name: "Cement", hex: "#9B9B8B" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 1299,
    priceRangeHigh: 1999,
  },

  {
    id: "shaka-wear-swds",
    name: "Max Heavyweight Garment Dye Drop Shoulder Tee",
    brand: "Shaka Wear",
    sku: "SWDS",
    garmentType: "tee",
    description:
      "7.5 oz. 100% USA cotton garment-dyed drop shoulder tee. Extended shoulders and a boxy silhouette give it a streetwear-forward look straight off the blank. Same heavyweight construction and clean print surface as the SHGD.",
    weightGsm: 255,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Shadow", hex: "#3A3A3A" },
      { name: "Oatmeal", hex: "#D4C8B0" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 1399,
    priceRangeHigh: 2099,
  },

  {
    id: "nl-6210",
    name: "CVC Crew Neck Tee",
    brand: "Next Level",
    sku: "6210",
    garmentType: "tee",
    description:
      "Lightweight CVC blend with an exceptionally smooth surface for sharp, true-to-color DTG prints. Relaxed crew neck and tear-away label. Great for branded and fashion-forward runs.",
    weightGsm: 155,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Vintage Royal", hex: "#3A5C9C" },
      { name: "Dark Heather Grey", hex: "#636363" },
      { name: "Cardinal", hex: "#8B1A1A" },
    ],
    printAreas: [
      { name: "front", widthIn: 12, heightIn: 16 },
      { name: "back", widthIn: 12, heightIn: 16 },
    ],
    priceRangeLow: 899,
    priceRangeHigh: 1399,
  },

  // ─── Hoodies ─────────────────────────────────────────────────────────────

  {
    id: "gildan-18500",
    name: "Heavy Blend Hoodie",
    brand: "Gildan",
    sku: "18500",
    garmentType: "hoodie",
    description:
      "50/50 cotton-poly pullover hoodie with a double-lined hood and front kangaroo pocket. Ribbed cuffs and waistband. Affordable anchor blank for hoodie collections.",
    weightGsm: 282,
    availableSizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    availableColors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Sport Grey", hex: "#A8A9AD" },
      { name: "Cardinal Red", hex: "#8E1A30" },
      { name: "Forest Green", hex: "#2D5016" },
    ],
    printAreas: [
      { name: "front", widthIn: 10, heightIn: 12 },
      { name: "back", widthIn: 12, heightIn: 14 },
    ],
    priceRangeLow: 1299,
    priceRangeHigh: 1999,
  },

  {
    id: "bc-3719",
    name: "Unisex Sponge Fleece Hoodie",
    brand: "Bella+Canvas",
    sku: "3719",
    garmentType: "hoodie",
    description:
      "Premium sponge fleece with a luxurious hand and retail-quality finish. Side-seamed for a tailored silhouette. Excellent ink absorption for high-resolution DTG on chest and back.",
    weightGsm: 259,
    availableSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    availableColors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Navy", hex: "#1E2C5C" },
      { name: "Dark Grey", hex: "#3A3A3A" },
      { name: "Maroon", hex: "#6B1B1B" },
    ],
    printAreas: [
      { name: "front", widthIn: 10, heightIn: 12 },
      { name: "back", widthIn: 12, heightIn: 14 },
    ],
    priceRangeLow: 1999,
    priceRangeHigh: 2999,
  },

  // ─── Tanks ───────────────────────────────────────────────────────────────

  {
    id: "gildan-2200",
    name: "Ultra Cotton Tank",
    brand: "Gildan",
    sku: "2200",
    garmentType: "tank",
    description:
      "100% ring-spun cotton sleeveless tee with a comfortable, relaxed fit. Lightweight and breathable — the go-to blank for warm-weather event merch and summer drops.",
    weightGsm: 185,
    availableSizes: ["S", "M", "L", "XL", "2XL"],
    availableColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Red", hex: "#B22222" },
      { name: "Charcoal", hex: "#4A4A4A" },
    ],
    printAreas: [
      { name: "front", widthIn: 10, heightIn: 12 },
      { name: "back", widthIn: 10, heightIn: 12 },
    ],
    priceRangeLow: 499,
    priceRangeHigh: 899,
  },

  // ─── Hats ────────────────────────────────────────────────────────────────

  {
    id: "richardson-112",
    name: "Trucker Cap",
    brand: "Richardson",
    sku: "112",
    garmentType: "hat",
    description:
      "Structured mid-pro trucker with mesh back panels and a snapback closure. Flat bill with a firm front panel ideal for DTG and embroidery. A print shop staple.",
    weightGsm: 180,
    availableSizes: ["One Size"],
    availableColors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Khaki", hex: "#C4A77D" },
      { name: "Charcoal", hex: "#4A4A4A" },
    ],
    printAreas: [
      { name: "front", widthIn: 5, heightIn: 3.5 },
    ],
    priceRangeLow: 1499,
    priceRangeHigh: 2299,
  },
];

export function getProductById(id: string): CatalogProduct | undefined {
  return CATALOG_PRODUCTS.find((p) => p.id === id);
}

export function getProductsByType(type: GarmentType): CatalogProduct[] {
  return CATALOG_PRODUCTS.filter((p) => p.garmentType === type);
}
