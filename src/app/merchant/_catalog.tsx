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
import { submitCartAction } from "@/actions/merchant-orders";
import { MockupEditor } from "./_mockup";
import type { FulfillmentGoal, MerchantOrder } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

// A single approved design item waiting in the cart.
type CartItem = {
  id: string;
  product: CatalogProduct;
  artworkDataUrl: string | null;
  mockupSnapshotUrl: string;
  selectedColorHex: string;
  printAreaName: string;
  templateLabel: string | null;
  quantity: number;
};

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

type ViewState = "catalog" | "mockup" | "cart" | "checkout";

export type MerchantCatalogClientProps = {
  blankBrandOptions: string[];
  blankStyleOptions: string[];
  submittedOrderId: string;
  submittedOrder: MerchantOrder | null;
};

export function MerchantCatalogClient({ submittedOrderId, submittedOrder }: MerchantCatalogClientProps) {
  const [view, setView] = useState<ViewState>("catalog");
  const [activeTab, setActiveTab] = useState<CatalogTab>("all");
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogProduct | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
  if (submittedOrderId) return (
    <OrderSuccessView
      orderId={submittedOrderId}
      order={submittedOrder}
      mockupSnapshotUrl={mockupSnapshotUrl}
      cartItems={cartItems}
    />
  );

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
          // Clear mockup state for the abandoned item
          setArtworkDataUrl(null);
          setMockupPosition(null);
          setMockupRelativeScale(100);
          setMockupColorHex(null);
          setMockupPrintAreaIndex(0);
          setMockupActiveTemplateId(null);
          setMockupIntendedCenter(null);
          setMockupTemplateAnchorPosition(null);
          setSelectedProduct(null);
          // If cart has items, return to cart; otherwise go to catalog
          if (cartItems.length > 0) {
            setView("cart");
          } else {
            setView("catalog");
          }
        }}
        onApprove={(dataUrl, snapshotUrl, printAreaName, templateLabel) => {
          if (!selectedProduct) return;
          const newItem: CartItem = {
            id: Date.now().toString(),
            product: selectedProduct,
            artworkDataUrl: dataUrl,
            mockupSnapshotUrl: snapshotUrl,
            selectedColorHex:
              mockupColorHex ?? selectedProduct.availableColors[0]?.hex ?? "#000000",
            printAreaName,
            templateLabel,
            quantity: 24,
          };
          setCartItems((prev) => [...prev, newItem]);
          setMockupSnapshotUrl(snapshotUrl);
          // Clear mockup state now that the item is in the cart
          setArtworkDataUrl(null);
          setMockupPosition(null);
          setMockupRelativeScale(100);
          setMockupColorHex(null);
          setMockupPrintAreaIndex(0);
          setMockupActiveTemplateId(null);
          setMockupIntendedCenter(null);
          setMockupTemplateAnchorPosition(null);
          setSelectedProduct(null);
          setView("cart");
        }}
      />
    );
  }

  // ── View C: Cart ──────────────────────────────────────────────────────
  if (view === "cart") {
    return (
      <CartView
        cartItems={cartItems}
        onUpdateQuantity={(id, quantity) =>
          setCartItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
          )
        }
        onRemoveItem={(id) =>
          setCartItems((prev) => prev.filter((item) => item.id !== id))
        }
        onAddAnother={() => {
          setView("catalog");
        }}
        onCheckout={() => setView("checkout")}
      />
    );
  }

  // ── View D: Checkout ──────────────────────────────────────────────────
  if (view === "checkout") {
    return (
      <CheckoutView
        cartItems={cartItems}
        onBack={() => setView("cart")}
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

// ─── View C: Cart ─────────────────────────────────────────────────────────────

function CartView({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onAddAnother,
  onCheckout,
}: {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onAddAnother: () => void;
  onCheckout: () => void;
}) {
  const totalPieces = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Your cart
      </p>
      <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
        {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
      </h2>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* Left: item list */}
        <div className="flex flex-col gap-4">
          {cartItems.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemoveItem}
            />
          ))}

          {/* Add another item */}
          <button
            type="button"
            onClick={onAddAnother}
            className="flex h-20 w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm font-medium text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
          >
            + Add another item
          </button>
        </div>

        {/* Right: order summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Order summary
          </p>

          <div className="mt-4 space-y-2">
            {cartItems.map((item) => {
              const colorName =
                item.product.availableColors.find(
                  (c) => c.hex === item.selectedColorHex,
                )?.name ?? "—";
              return (
                <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-zinc-600 leading-5">
                    {item.product.brand} {item.product.name}
                    <br />
                    <span className="text-xs text-zinc-400">{colorName}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-zinc-950">
                    {item.quantity} pcs
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-zinc-100 pt-4">
            <div className="flex justify-between text-sm font-semibold text-zinc-950">
              <span>Total pieces</span>
              <span>{totalPieces}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCheckout}
            className="mt-5 h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
          >
            Checkout →
          </button>
        </div>
      </div>
    </section>
  );
}

function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  const colorName =
    item.product.availableColors.find((c) => c.hex === item.selectedColorHex)
      ?.name ?? item.selectedColorHex;

  return (
    <div className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* Thumbnail */}
      {item.mockupSnapshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.mockupSnapshotUrl}
          alt={item.product.name}
          className="h-20 w-20 shrink-0 rounded-lg border border-zinc-200 object-cover shadow-sm"
        />
      ) : (
        <div
          className="h-20 w-20 shrink-0 rounded-lg border border-zinc-200"
          style={{ backgroundColor: item.selectedColorHex }}
        />
      )}

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {item.product.brand}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-zinc-950">
          {item.product.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: item.selectedColorHex }}
          />
          <span className="text-xs text-zinc-500">{colorName}</span>
          <span className="text-xs text-zinc-300">·</span>
          <span className="text-xs capitalize text-zinc-500">
            {item.printAreaName.replace(/_/g, " ")} print
          </span>
        </div>
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          ✓ Design approved
        </p>
      </div>

      {/* Quantity + remove */}
      <div className="flex shrink-0 flex-col items-end justify-between">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-xs text-zinc-400 transition hover:text-red-500"
        >
          Remove
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-zinc-950">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateQuantity(item.id, Math.min(500, item.quantity + 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View D: Checkout ─────────────────────────────────────────────────────────

function CheckoutView({
  cartItems,
  onBack,
}: {
  cartItems: CartItem[];
  onBack: () => void;
}) {
  const cartItemsForSubmit = cartItems.map((item) => ({
    garmentType: CATALOG_TO_ROUTING_GARMENT[item.product.garmentType],
    preferredBlankBrand: item.product.brand,
    preferredBlankStyle: `${item.product.sku} ${item.product.name}`,
  }));

  return (
    <section className="py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
      >
        ← Back to cart
      </button>

      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Checkout
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
          Review &amp; place order
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Confirm quantities and fulfillment details. Your order will be routed
          to top-matched local providers.
        </p>
      </div>

      <form
        action={submitCartAction}
        className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start"
      >
        {/* Serialize cart for server action */}
        <input
          type="hidden"
          name="cartItemsJson"
          value={JSON.stringify(cartItemsForSubmit)}
        />

        {/* Left: items + fulfillment */}
        <div className="flex flex-col gap-6">
          {/* Items list */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Items ({cartItems.length})
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {cartItems.map((item, i) => {
                const colorName =
                  item.product.availableColors.find(
                    (c) => c.hex === item.selectedColorHex,
                  )?.name ?? "—";
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    {item.mockupSnapshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.mockupSnapshotUrl}
                        alt={item.product.name}
                        className="h-14 w-14 shrink-0 rounded-md border border-zinc-200 object-cover"
                      />
                    ) : (
                      <div
                        className="h-14 w-14 shrink-0 rounded-md border border-zinc-200"
                        style={{ backgroundColor: item.selectedColorHex }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-950">
                        {item.product.brand} {item.product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {colorName} · {item.printAreaName.replace(/_/g, " ")} print
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-zinc-500 mb-1">Qty</p>
                      <input
                        type="number"
                        name={`quantity_${i}`}
                        min="1"
                        max="500"
                        defaultValue={item.quantity}
                        className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fulfillment details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Fulfillment
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

              <label className={formLabel}>
                Fulfillment ZIP
                <input
                  name="fulfillmentZip"
                  inputMode="numeric"
                  placeholder="e.g. 90401"
                  className={formInput}
                />
              </label>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <input type="hidden" name="localPickupPreferred" value="false" />
              <input
                type="checkbox"
                name="localPickupPreferred"
                value="true"
                className="mt-1 h-4 w-4 accent-zinc-950"
              />
              <span>Prefer local pickup when a provider supports it</span>
            </label>
          </div>
        </div>

        {/* Right: submit panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Order total
          </p>
          <div className="mt-3 space-y-1.5">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-600">
                  {item.product.name}
                </span>
                <span className="font-medium text-zinc-950">
                  {item.quantity} pcs
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <div className="flex justify-between text-sm font-semibold text-zinc-950">
              <span>Total pieces</span>
              <span>{cartItems.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
          >
            Place order &amp; route →
          </button>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Your order will be routed to top-matched local providers after
            submission.
          </p>
        </div>
      </form>
    </section>
  );
}


// ─── Order success view ───────────────────────────────────────────────────────

function OrderSuccessView({
  orderId: _orderId,
  order,
  mockupSnapshotUrl,
  cartItems,
}: {
  orderId: string;
  order: MerchantOrder | null;
  mockupSnapshotUrl: string;
  cartItems: CartItem[];
}) {
  const [showDetails, setShowDetails] = useState(true);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-md text-center">
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
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {showDetails ? "Hide order details" : "View order details"}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-zinc-200 bg-white shadow-sm">
          {order ? (
            <OrderSummaryCard order={order} mockupSnapshotUrl={mockupSnapshotUrl} cartItems={cartItems} />
          ) : (
            <div className="p-6 text-center text-sm text-zinc-500">
              Order details unavailable. Check your order history below.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderSummaryCard({
  order,
  mockupSnapshotUrl,
  cartItems,
}: {
  order: MerchantOrder;
  mockupSnapshotUrl: string;
  cartItems: CartItem[];
}) {
  const items = order.items;
  const item = items[0]; // kept for backward compat with existing single-item fields

  const garmentTypeLabels: Record<string, string> = {
    t_shirt: "T-Shirt",
    long_sleeve: "Long Sleeve",
    hoodie: "Hoodie",
    crewneck: "Crewneck",
    tank: "Tank",
    tote: "Tote",
    hat: "Hat",
  };

  const fulfillmentGoalLabels: Record<string, string> = {
    local_first: "Local first",
    fastest_turnaround: "Fastest turnaround",
    lowest_cost: "Lowest cost",
    premium_blank: "Premium blank",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    ready_for_routing: "Ready for routing",
    routed: "Routed",
    accepted: "Accepted",
    in_production: "In production",
    ready: "Ready",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="divide-y divide-zinc-100">

      <div className="px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Order details
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-400">Status</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-950">
              {statusLabels[order.status] ?? order.status}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Order ID</p>
            <p className="mt-0.5 break-all font-mono text-xs text-zinc-600">
              {order.id.slice(0, 8)}...
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Fulfillment goal</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-950">
              {fulfillmentGoalLabels[order.fulfillmentGoal] ?? order.fulfillmentGoal}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">ZIP code</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-950">
              {order.fulfillmentZip || "—"}
            </p>
          </div>
          {order.localPickupPreferred && (
            <div className="col-span-2">
              <p className="text-xs text-zinc-400">Local pickup preferred</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-950">Yes</p>
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {items.length === 1 ? "Item" : `Items (${items.length})`}
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {items.map((orderItem, i) => (
              <div key={orderItem.id || i} className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                {(() => {
                  const snap = cartItems[i]?.mockupSnapshotUrl || (i === 0 ? mockupSnapshotUrl : null);
                  return snap ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={snap}
                      alt="Approved mockup"
                      className="col-span-2 h-16 w-16 rounded-md border border-zinc-200 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="col-span-2 h-16 w-16 rounded-md border border-zinc-200 bg-zinc-200" />
                  );
                })()}
                <div>
                  <p className="text-xs text-zinc-400">Garment</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-950">
                    {garmentTypeLabels[orderItem.garmentType] ?? orderItem.garmentType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Quantity</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-950">
                    {orderItem.quantity} units
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Print method</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-950">
                    {orderItem.printMethod?.toUpperCase() ?? "DTG"}
                  </p>
                </div>
                {orderItem.preferredBlankBrand && (
                  <div>
                    <p className="text-xs text-zinc-400">Blank brand</p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-950">
                      {orderItem.preferredBlankBrand}
                    </p>
                  </div>
                )}
                {orderItem.preferredBlankStyle && (
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-400">Blank style</p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-950">
                      {orderItem.preferredBlankStyle}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        <p className="text-xs text-zinc-400">
          Submitted{" "}
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
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
