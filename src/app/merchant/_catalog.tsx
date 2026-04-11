"use client";

import { useState } from "react";
import {
  CATALOG_PRODUCTS,
  CATALOG_TO_ROUTING_GARMENT,
} from "@/lib/catalog/products";
import type {
  CatalogProduct,
  GarmentType as CatalogGarmentType,
} from "@/lib/catalog/products";
import { submitMerchantOrderAction } from "@/actions/merchant-orders";
import { MockupEditor } from "./_mockup";
import type { FulfillmentGoal } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

type CatalogTab = "all" | CatalogGarmentType;

const TABS: { value: CatalogTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tee", label: "Tees" },
  { value: "hoodie", label: "Hoodies" },
  { value: "tank", label: "Tanks" },
  { value: "hat", label: "Hats" },
];

const GARMENT_TYPE_LABELS: Record<CatalogGarmentType, string> = {
  tee: "T-Shirt",
  hoodie: "Hoodie",
  tank: "Tank",
  hat: "Hat",
};

const FULFILLMENT_GOAL_OPTIONS: { value: FulfillmentGoal; label: string }[] = [
  { value: "local_first", label: "Local first" },
  { value: "fastest_turnaround", label: "Fastest turnaround" },
  { value: "lowest_cost", label: "Lowest cost" },
  { value: "premium_blank", label: "Premium blank" },
];

const formLabel = "text-sm font-medium text-zinc-700";
const formInput =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";

// ─── Main export ─────────────────────────────────────────────────────────────

type ViewState = "catalog" | "mockup" | "order";

export type MerchantCatalogClientProps = {
  blankBrandOptions: string[];
  blankStyleOptions: string[];
  submittedOrderId: string;
};

export function MerchantCatalogClient({ submittedOrderId }: MerchantCatalogClientProps) {
  const [view, setView] = useState<ViewState>("catalog");
  const [activeTab, setActiveTab] = useState<CatalogTab>("all");
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogProduct | null>(null);

  // Lifted mockup state — persisted across back-navigation
  const [artworkDataUrl, setArtworkDataUrl] = useState<string | null>(null);
  const [mockupSnapshotUrl, setMockupSnapshotUrl] = useState<string>("");
  const [mockupPosition, setMockupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // Relative scale 1–100 matching MockupEditor's system (100 = fills print area).
  const [mockupRelativeScale, setMockupRelativeScale] = useState(100);
  const [mockupColorHex, setMockupColorHex] = useState<string | null>(null);
  const [mockupPrintAreaIndex, setMockupPrintAreaIndex] = useState(0);
  const [mockupActiveTemplateId, setMockupActiveTemplateId] = useState<string | null>(null);
  const [mockupIntendedCenter, setMockupIntendedCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mockupTemplateAnchorPosition, setMockupTemplateAnchorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Set on approve — passed to the order form
  const [selectedPrintAreaName, setSelectedPrintAreaName] = useState<string>("");
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string | null>(null);

  const filteredProducts =
    activeTab === "all"
      ? CATALOG_PRODUCTS
      : CATALOG_PRODUCTS.filter((p) => p.garmentType === activeTab);

  // After a form submission the server redirects to /merchant?orderId=...
  // Show the success view immediately instead of resetting to the catalog.
  if (submittedOrderId) return <OrderSuccessView orderId={submittedOrderId} />;

  // ── View B: Mockup editor ─────────────────────────────────────────────
  if (view === "mockup" && selectedProduct) {
    return (
      <MockupEditor
        product={selectedProduct}
        initialArtworkDataUrl={artworkDataUrl}
        initialPosition={mockupPosition}
        initialRelativeScale={mockupRelativeScale}
        initialColorHex={mockupColorHex}
        initialPrintAreaIndex={mockupPrintAreaIndex}
        initialActiveTemplateId={mockupActiveTemplateId}
        initialIntendedCenter={mockupIntendedCenter}
        initialTemplateAnchorPosition={mockupTemplateAnchorPosition}
        onArtworkChange={setArtworkDataUrl}
        onPositionChange={setMockupPosition}
        onRelativeScaleChange={setMockupRelativeScale}
        onColorChange={setMockupColorHex}
        onPrintAreaChange={setMockupPrintAreaIndex}
        onActiveTemplateChange={setMockupActiveTemplateId}
        onIntendedCenterChange={setMockupIntendedCenter}
        onTemplateAnchorPositionChange={setMockupTemplateAnchorPosition}
        onBack={() => {
          // Back to catalog — clear all mockup state
          setView("catalog");
          setSelectedProduct(null);
          setArtworkDataUrl(null);
          setMockupPosition(null);
          setMockupRelativeScale(100);
          setMockupColorHex(null);
          setMockupPrintAreaIndex(0);
          setMockupActiveTemplateId(null);
          setMockupIntendedCenter(null);
          setMockupTemplateAnchorPosition(null);
        }}
        onApprove={(dataUrl, snapshotUrl, printAreaName, templateLabel) => {
          setArtworkDataUrl(dataUrl);
          setMockupSnapshotUrl(snapshotUrl);
          setSelectedPrintAreaName(printAreaName);
          setSelectedTemplateLabel(templateLabel);
          setView("order");
        }}
      />
    );
  }

  // ── View C: Order form ────────────────────────────────────────────────
  if (view === "order" && selectedProduct) {
    return (
      <OrderFormView
        product={selectedProduct}
        artworkDataUrl={artworkDataUrl}
        selectedColorHex={mockupColorHex}
        mockupSnapshotUrl={mockupSnapshotUrl}
        printAreaName={selectedPrintAreaName}
        templateLabel={selectedTemplateLabel}
        onBack={() => setView("mockup")}
      />
    );
  }

  // ── View A: Catalog ───────────────────────────────────────────────────
  return (
    <CatalogView
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      filteredProducts={filteredProducts}
      onSelectProduct={(product) => {
        setSelectedProduct(product);
        setView("mockup");
      }}
    />
  );
}

// ─── View A: Catalog ──────────────────────────────────────────────────────────

function CatalogView({
  activeTab,
  setActiveTab,
  filteredProducts,
  onSelectProduct,
}: {
  activeTab: CatalogTab;
  setActiveTab: (tab: CatalogTab) => void;
  filteredProducts: CatalogProduct[];
  onSelectProduct: (product: CatalogProduct) => void;
}) {
  return (
    <section className="py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Product catalog
      </p>
      <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
        Choose a garment to get started
      </h2>

      {/* Tab strip */}
      <div className="mt-8 flex w-fit gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.value
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onSelect,
}: {
  product: CatalogProduct;
  onSelect: (product: CatalogProduct) => void;
}) {
  const firstHex = product.availableColors[0]?.hex ?? "#A8A9AD";
  const priceLabel = `From $${(product.priceRangeLow / 100).toFixed(2)}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Color placeholder */}
      <div className="relative h-40 overflow-hidden bg-zinc-100">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${firstHex}2e 0%, ${firstHex}6e 100%)`,
          }}
        />
        <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-700 backdrop-blur-sm">
          {GARMENT_TYPE_LABELS[product.garmentType]}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {product.brand}
        </p>
        <h3 className="mt-1 text-base font-semibold text-zinc-950">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-400">{product.sku}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
          {product.description}
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-950">{priceLabel}</p>

        {/* Color swatches */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.availableColors.map((color) => (
            <div
              key={color.name}
              title={color.name}
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="mt-5 h-10 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
        >
          Start order →
        </button>
      </div>
    </div>
  );
}

// ─── View C: Order form ───────────────────────────────────────────────────────

function OrderFormView({
  product,
  artworkDataUrl,
  selectedColorHex,
  mockupSnapshotUrl,
  printAreaName,
  templateLabel,
  onBack,
}: {
  product: CatalogProduct;
  artworkDataUrl: string | null;
  selectedColorHex: string | null;
  mockupSnapshotUrl: string;
  printAreaName: string;
  templateLabel: string | null;
  onBack: () => void;
}) {
  const routingGarmentType = CATALOG_TO_ROUTING_GARMENT[product.garmentType];
  const resolvedColorHex = selectedColorHex ?? product.availableColors[0]?.hex ?? "#000000";
  const colorName =
    product.availableColors.find((c) => c.hex === resolvedColorHex)?.name ??
    resolvedColorHex;

  return (
    <section className="py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
      >
        ← Back to mockup
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-start">
        {/* Left: product summary */}
        <ProductSummaryCard product={product} printAreaName={printAreaName} />

        {/* Right: order form */}
        <form
          action={submitMerchantOrderAction}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {/* Mockup snapshot preview */}
          {mockupSnapshotUrl && (
            <div className="mb-6 flex gap-4 items-start rounded-xl border-2 border-zinc-950 bg-white p-4 shadow-sm">
              <img
                src={mockupSnapshotUrl}
                alt="Your approved mockup"
                className="w-24 h-24 rounded-lg object-cover border border-zinc-200 shadow-sm"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-950">
                  Approved mockup
                </p>
                <p className="mt-1 text-sm text-zinc-700">
                  {product.brand} {product.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{product.sku}</p>
                {printAreaName && (
                  <p className="mt-1 text-xs text-zinc-500 capitalize">
                    {printAreaName.replace(/_/g, " ")} print area
                  </p>
                )}
                {templateLabel && (
                  <p className="mt-0.5 text-xs text-zinc-500">{templateLabel}</p>
                )}
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  ✓ Design approved
                </p>
              </div>
            </div>
          )}

          {/* Hidden inputs for print area and template */}
          <input type="hidden" name="printAreaName" value={printAreaName} />
          {templateLabel && (
            <input type="hidden" name="templateLabel" value={templateLabel} />
          )}

          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Order details
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
              Configure your order
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Submitting saves the order and routes it to your verified local
              providers.
            </p>
          </div>

          {/* Garment type passed to action as routing-compatible value */}
          <input type="hidden" name="garmentType" value={routingGarmentType} />
          <input type="hidden" name="garmentColor" value={resolvedColorHex} />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Garment type display (read-only) */}
            <div>
              <p className={formLabel}>Garment type</p>
              <div className="mt-2 flex h-11 items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700">
                  {product.brand} {product.name}
                </span>
              </div>
            </div>

            {/* Garment color display (read-only) */}
            <div>
              <p className={formLabel}>Garment color</p>
              <div className="mt-2 flex h-11 items-center rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2.5 gap-2">
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: resolvedColorHex }}
                />
                <span className="text-sm text-zinc-600">{colorName}</span>
              </div>
            </div>

            {/* Fulfillment goal */}
            <label className={formLabel}>
              Fulfillment goal
              <select
                name="fulfillmentGoal"
                defaultValue="local_first"
                className={formInput}
              >
                {FULFILLMENT_GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Fulfillment ZIP */}
            <label className={formLabel}>
              Fulfillment ZIP
              <input
                name="fulfillmentZip"
                inputMode="numeric"
                placeholder="e.g. 90401"
                className={formInput}
              />
            </label>

            {/* Quantity */}
            <label className={formLabel}>
              Quantity
              <input
                name="quantity"
                type="number"
                min="1"
                max="500"
                defaultValue={24}
                className={formInput}
              />
            </label>

            {/* Preferred blank brand — locked to selected product */}
            <label className={formLabel}>
              Preferred blank brand
              <input
                name="preferredBlankBrand"
                readOnly
                value={product.brand}
                className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-500 outline-none cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-400">Set by selected product</p>
            </label>

            {/* Preferred blank style — locked to selected product */}
            <label className={`${formLabel} sm:col-span-2`}>
              Preferred blank style
              <input
                name="preferredBlankStyle"
                readOnly
                value={`${product.sku} ${product.name}`}
                className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-500 outline-none cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-400">Set by selected product</p>
            </label>
          </div>

          {/* Local pickup checkbox */}
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <input type="hidden" name="localPickupPreferred" value="false" />
            <input
              type="checkbox"
              name="localPickupPreferred"
              value="true"
              className="mt-1 h-4 w-4 accent-zinc-950"
            />
            <span>Prefer local pickup when a provider supports it</span>
          </label>

          <button
            type="submit"
            className="mt-6 h-11 rounded-md bg-zinc-950 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
          >
            Save order &amp; route →
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── Order success view ───────────────────────────────────────────────────────

function OrderSuccessView({ orderId }: { orderId: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-5xl">✓</div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Order submitted
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
          Your order is being routed
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          Your order has been saved and sent to your top-matched local providers.
          You&apos;ll see status updates as providers accept and move it through
          production.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="/merchant"
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Start a new order
          </a>
          <a
            href={`/merchant?orderId=${orderId}`}
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            View order details
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Product summary card ─────────────────────────────────────────────────────

function ProductSummaryCard({
  product,
  printAreaName,
}: {
  product: CatalogProduct;
  printAreaName: string;
}) {
  const firstHex = product.availableColors[0]?.hex ?? "#A8A9AD";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Color header */}
      <div className="relative h-28 bg-zinc-100">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${firstHex}2e 0%, ${firstHex}6e 100%)`,
          }}
        />
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {product.brand}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-400">{product.sku}</p>

        {/* Color swatches */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Available colors
          </p>
          <div className="flex flex-wrap gap-1.5">
            {product.availableColors.map((color) => (
              <div
                key={color.name}
                title={color.name}
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>

        {/* Print area — single selected area */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-zinc-500">Max print area</p>
          {(() => {
            const area =
              product.printAreas.find(
                (a) => a.name.toLowerCase() === printAreaName.toLowerCase(),
              ) ?? product.printAreas[0];
            if (!area) return null;
            return (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-medium text-white capitalize">
                  {area.name.replace(/_/g, " ")}
                  <span className="font-normal text-zinc-400">
                    {area.widthIn}&quot; × {area.heightIn}&quot;
                  </span>
                </span>
                <p className="mt-1.5 text-xs text-zinc-400">
                  This is the largest printable area on this garment. Your
                  artwork placement may use less.
                </p>
              </>
            );
          })()}
        </div>

        {/* Specs */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="font-medium text-zinc-700">Weight</span>
            <p className="mt-0.5 text-zinc-500">{product.weightGsm} gsm</p>
          </div>
          <div>
            <span className="font-medium text-zinc-700">Sizes</span>
            <p className="mt-0.5 text-zinc-500">
              {product.availableSizes.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
