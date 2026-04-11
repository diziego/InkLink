"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog/products";

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZE = 400;
const INCH_PX = 22; // 1 inch = 22 canvas pixels

// ─── Types ────────────────────────────────────────────────────────────────────

export type MockupEditorProps = {
  product: CatalogProduct;
  onApprove: (
    artworkDataUrl: string | null,
    mockupSnapshotUrl: string,
    printAreaName: string,
    templateLabel: string | null,
  ) => void;
  onBack: () => void;
  // Lifted state — initialized from props, flows back via onChange callbacks
  // so the parent always holds the latest values and can restore them on
  // re-mount when the user navigates back from the order form.
  initialArtworkDataUrl: string | null;
  initialPosition: { x: number; y: number } | null;
  // Relative scale 1–100 where 100 = artwork fills the print area at its maximum.
  // The actual pixel draw scale is derived: actualScale = (relativeScale/100) * maxAllowedScale.
  initialRelativeScale: number;
  initialColorHex: string | null;
  initialPrintAreaIndex: number;
  initialActiveTemplateId: string | null;
  initialIntendedCenter: { x: number; y: number } | null;
  initialTemplateAnchorPosition: { x: number; y: number } | null;
  onArtworkChange: (dataUrl: string | null) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onRelativeScaleChange: (relativeScale: number) => void;
  onColorChange: (hex: string) => void;
  onPrintAreaChange: (index: number) => void;
  onActiveTemplateChange: (id: string | null) => void;
  onIntendedCenterChange: (center: { x: number; y: number } | null) => void;
  onTemplateAnchorPositionChange: (pos: { x: number; y: number } | null) => void;
};

type Position = { x: number; y: number };
type Size = { w: number; h: number };

type DragState = {
  active: boolean;
  startMouseX: number;
  startMouseY: number;
  startPosX: number;
  startPosY: number;
};

// Always-current mirror of reactive state — updated synchronously on every
// render so window event handler closures (mounted once) always read fresh values.
type StateSnapshot = {
  selectedPrintAreaIndex: number;
  artworkNaturalSize: Size | null;
  artworkPosition: Position;
  artworkScale: number; // stores actualScale (derived)
  templateAnchorPosition: Position | null;
  activeTemplateId: string | null;
};

type PlacementTemplate = {
  id: string;
  label: string;
  description: string;
  printAreas: string[];
  targetWidthIn: number;
  anchorX: "left" | "center" | "right";
  anchorY: "top" | "center" | "bottom";
  offsetXPercent: number;
  offsetYPercent: number;
};

// ─── Placement templates ──────────────────────────────────────────────────────

const PLACEMENT_TEMPLATES: PlacementTemplate[] = [
  {
    id: "left_chest",
    label: "Left Chest",
    description: "3–4\" logo, upper left",
    printAreas: ["front", "Front"],
    targetWidthIn: 3.5,
    anchorX: "left",
    anchorY: "top",
    offsetXPercent: 0.06,
    offsetYPercent: 0.06,
  },
  {
    id: "center_chest",
    label: "Center Chest",
    description: "7–8\" graphic, upper center",
    printAreas: ["front", "Front"],
    targetWidthIn: 7.5,
    anchorX: "center",
    anchorY: "top",
    offsetXPercent: 0,
    offsetYPercent: 0.08,
  },
  {
    id: "full_front",
    label: "Full Front",
    description: "Standard full front, centered",
    printAreas: ["front", "Front"],
    targetWidthIn: 11,
    anchorX: "center",
    anchorY: "center",
    offsetXPercent: 0,
    offsetYPercent: 0,
  },
  {
    id: "oversize_front",
    label: "Oversize Front",
    description: "Edge-to-edge, max print area",
    printAreas: ["front", "Front"],
    targetWidthIn: 999,
    anchorX: "center",
    anchorY: "center",
    offsetXPercent: 0,
    offsetYPercent: 0,
  },
  {
    id: "upper_back",
    label: "Upper Back",
    description: "10–12\" graphic, top of back",
    printAreas: ["back", "Back"],
    targetWidthIn: 11,
    anchorX: "center",
    anchorY: "top",
    offsetXPercent: 0,
    offsetYPercent: 0.05,
  },
  {
    id: "full_back",
    label: "Full Back",
    description: "Edge-to-edge back print",
    printAreas: ["back", "Back"],
    targetWidthIn: 999,
    anchorX: "center",
    anchorY: "center",
    offsetXPercent: 0,
    offsetYPercent: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPrintAreaRect(widthIn: number, heightIn: number) {
  const w = widthIn * INCH_PX;
  const h = heightIn * INCH_PX;
  return { x: (CANVAS_SIZE - w) / 2, y: (CANVAS_SIZE - h) / 2, w, h };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MockupEditor({
  product,
  onApprove,
  onBack,
  initialArtworkDataUrl,
  initialPosition,
  initialRelativeScale,
  initialColorHex,
  initialPrintAreaIndex,
  initialActiveTemplateId,
  initialIntendedCenter,
  initialTemplateAnchorPosition,
  onArtworkChange,
  onPositionChange,
  onRelativeScaleChange,
  onColorChange,
  onPrintAreaChange,
  onActiveTemplateChange,
  onIntendedCenterChange,
  onTemplateAnchorPositionChange,
}: MockupEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutable drag state — read by window event handlers via ref to avoid
  // stale closures without needing to re-register the listeners.
  const dragRef = useRef<DragState>({
    active: false,
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const stateRef = useRef<StateSnapshot>({
    selectedPrintAreaIndex: initialPrintAreaIndex,
    artworkNaturalSize: null,
    artworkPosition: initialPosition ?? { x: 0, y: 0 },
    artworkScale: 0,
    templateAnchorPosition: initialTemplateAnchorPosition,
    activeTemplateId: initialActiveTemplateId,
  });

  // ── Reactive state — initialized from lifted props ──────────────────────

  const [selectedColorHex, setSelectedColorHex] = useState(
    () => initialColorHex ?? product.availableColors[0]?.hex ?? "#888888",
  );
  const [selectedPrintAreaIndex, setSelectedPrintAreaIndex] =
    useState(initialPrintAreaIndex);
  const [artworkDataUrl, setArtworkDataUrl] = useState<string | null>(
    initialArtworkDataUrl,
  );
  const [artworkImage, setArtworkImage] = useState<HTMLImageElement | null>(null);
  const [artworkNaturalSize, setArtworkNaturalSize] = useState<Size | null>(null);
  const [maxAllowedScale, setMaxAllowedScale] = useState(1.5);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    initialActiveTemplateId,
  );
  const [templateAnchorPosition, setTemplateAnchorPosition] =
    useState<Position | null>(initialTemplateAnchorPosition);
  const [showGrid, setShowGrid] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [artworkPosition, setArtworkPosition] = useState<Position>(
    initialPosition ?? { x: 0, y: 0 },
  );
  // Relative scale: 1–100 where 100 = artwork fills the print area at maxAllowedScale.
  const [relativeScale, setRelativeScale] = useState<number>(initialRelativeScale);
  // Logical anchor for scale operations — tracks where the artwork center should
  // be regardless of clamping. Set by templates, snap-to-center, and drag end.
  // Never updated during slider interaction so the anchor stays fixed even when
  // the artwork is pressed against a boundary.
  const [intendedCenter, setIntendedCenter] = useState<Position | null>(
    initialIntendedCenter,
  );

  // Derived actual pixel scale used for canvas drawing and position math.
  const actualScale = (relativeScale / 100) * maxAllowedScale;

  // Keep the snapshot ref current on every render so window event handlers
  // (registered once) always read the latest values without stale closures.
  stateRef.current = {
    selectedPrintAreaIndex,
    artworkNaturalSize,
    artworkPosition,
    artworkScale: actualScale,
    templateAnchorPosition,
    activeTemplateId,
  };

  const selectedPrintArea =
    product.printAreas[selectedPrintAreaIndex] ??
    product.printAreas[0] ??
    { name: "front", widthIn: 12, heightIn: 16 };

  // Memoized print area rect — stable reference between renders so the canvas
  // useEffect doesn't redraw on unrelated state changes.
  const printAreaPx = useMemo(
    () => getPrintAreaRect(selectedPrintArea.widthIn, selectedPrintArea.heightIn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPrintArea.widthIn, selectedPrintArea.heightIn],
  );

  // Templates filtered to the currently selected print area
  const visibleTemplates = PLACEMENT_TEMPLATES.filter((t) =>
    t.printAreas.includes(selectedPrintArea.name),
  );

  // True when artwork is at its maximum size for the print area.
  const isAtSizeCap = artworkImage !== null && relativeScale >= 99;

  // ── Restore artwork image on mount when initial data URL is provided ───

  useEffect(() => {
    if (!initialArtworkDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const area =
        product.printAreas[initialPrintAreaIndex] ??
        product.printAreas[0] ??
        { widthIn: 12, heightIn: 16 };
      const { w: rw, h: rh } = getPrintAreaRect(area.widthIn, area.heightIn);
      const fitScale = Math.min(
        (rw * 0.85) / img.width,
        (rh * 0.85) / img.height,
      );
      setArtworkImage(img);
      setArtworkNaturalSize({ w: img.width * fitScale, h: img.height * fitScale });
      // Don't reset position/scale — they were restored from initial props.
    };
    img.src = initialArtworkDataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only — intentionally ignores prop changes after mount

  // ── Propagate state changes to parent ──────────────────────────────────
  // The parent stores these values so they survive navigation away and back.

  useEffect(() => {
    onArtworkChange(artworkDataUrl);
  }, [artworkDataUrl, onArtworkChange]);

  useEffect(() => {
    onPositionChange(artworkPosition);
  }, [artworkPosition, onPositionChange]);

  useEffect(() => {
    onRelativeScaleChange(relativeScale);
  }, [relativeScale, onRelativeScaleChange]);

  useEffect(() => {
    onColorChange(selectedColorHex);
  }, [selectedColorHex, onColorChange]);

  useEffect(() => {
    onPrintAreaChange(selectedPrintAreaIndex);
  }, [selectedPrintAreaIndex, onPrintAreaChange]);

  useEffect(() => {
    onActiveTemplateChange(activeTemplateId);
  }, [activeTemplateId, onActiveTemplateChange]);

  useEffect(() => {
    onIntendedCenterChange(intendedCenter);
  }, [intendedCenter, onIntendedCenterChange]);

  useEffect(() => {
    onTemplateAnchorPositionChange(templateAnchorPosition);
  }, [templateAnchorPosition, onTemplateAnchorPositionChange]);

  // ── Recompute maxAllowedScale whenever the image or print area changes ──

  useEffect(() => {
    const pw = selectedPrintArea.widthIn * INCH_PX;
    const ph = selectedPrintArea.heightIn * INCH_PX;
    const maxScale = artworkNaturalSize
      ? Math.min(pw / artworkNaturalSize.w, ph / artworkNaturalSize.h, 1.5)
      : 1.5;
    setMaxAllowedScale(maxScale);
    // relativeScale stays in 1–100 so no clamping needed — actualScale
    // automatically respects the new ceiling via the derived formula.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkNaturalSize, selectedPrintArea]);

  // ── Canvas redraw ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x: rx, y: ry, w: rw, h: rh } = printAreaPx;

    // 1. Background fill
    ctx.fillStyle = selectedColorHex;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2. Print area dashed rectangle — adaptive contrast based on garment color
    const r = parseInt(selectedColorHex.slice(1, 3), 16);
    const g = parseInt(selectedColorHex.slice(3, 5), 16);
    const b = parseInt(selectedColorHex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const strokeColor =
      luminance > 0.5 ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.85)";
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
    ctx.restore();

    // 2b. Rule-of-thirds grid overlay
    if (showGrid) {
      const gridColor =
        luminance > 0.5 ? "rgba(30,30,30,0.15)" : "rgba(255,255,255,0.15)";
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(rx + rw / 3, ry);
      ctx.lineTo(rx + rw / 3, ry + rh);
      ctx.moveTo(rx + (rw * 2) / 3, ry);
      ctx.lineTo(rx + (rw * 2) / 3, ry + rh);
      ctx.moveTo(rx, ry + rh / 3);
      ctx.lineTo(rx + rw, ry + rh / 3);
      ctx.moveTo(rx, ry + (rh * 2) / 3);
      ctx.lineTo(rx + rw, ry + (rh * 2) / 3);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Artwork image or placeholder text
    if (artworkImage && artworkNaturalSize) {
      const aw = artworkNaturalSize.w * actualScale;
      const ah = artworkNaturalSize.h * actualScale;
      ctx.drawImage(
        artworkImage,
        rx + artworkPosition.x,
        ry + artworkPosition.y,
        aw,
        ah,
      );
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Upload or drop artwork", rx + rw / 2, ry + rh / 2);
      ctx.restore();
    }

    // 4. PRINT AREA label — on top so it's always readable
    ctx.save();
    ctx.fillStyle =
      luminance > 0.5 ? "rgba(30,30,30,0.5)" : "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("PRINT AREA", rx + 6, ry + 5);
    ctx.restore();
  }, [
    selectedColorHex,
    printAreaPx,
    artworkImage,
    artworkNaturalSize,
    artworkPosition,
    actualScale,
    showGrid,
  ]);

  // ── Global mouse / touch handlers (mounted once) ────────────────────────

  useEffect(() => {
    function applyDrag(clientX: number, clientY: number) {
      const dr = dragRef.current;
      if (!dr.active) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const dx = (clientX - dr.startMouseX) * scaleX;
      const dy = (clientY - dr.startMouseY) * scaleY;

      const sr = stateRef.current;
      const area =
        product.printAreas[sr.selectedPrintAreaIndex] ?? product.printAreas[0];
      if (!area) return;

      const { w: rw, h: rh } = getPrintAreaRect(area.widthIn, area.heightIn);
      if (!sr.artworkNaturalSize) return;
      const aw = sr.artworkNaturalSize.w * sr.artworkScale;
      const ah = sr.artworkNaturalSize.h * sr.artworkScale;

      const newPos = {
        x: Math.max(0, Math.min(Math.max(0, rw - aw), dr.startPosX + dx)),
        y: Math.max(0, Math.min(Math.max(0, rh - ah), dr.startPosY + dy)),
      };

      // Deselect template in real time if artwork has drifted from anchor.
      if (sr.templateAnchorPosition && sr.activeTemplateId) {
        const tdx = Math.abs(newPos.x - sr.templateAnchorPosition.x);
        const tdy = Math.abs(newPos.y - sr.templateAnchorPosition.y);
        if (tdx > 12 || tdy > 12) {
          setActiveTemplateId(null);
          setTemplateAnchorPosition(null);
          stateRef.current.templateAnchorPosition = null;
          stateRef.current.activeTemplateId = null;
        }
      }

      // Update stateRef synchronously so onMouseUp reads the final position
      // before React has had a chance to re-render.
      stateRef.current.artworkPosition = newPos;
      setArtworkPosition(newPos);
    }

    function onMouseMove(e: MouseEvent) {
      applyDrag(e.clientX, e.clientY);
    }

    function onMouseUp() {
      if (dragRef.current.active) {
        const sr = stateRef.current;
        if (sr.artworkNaturalSize) {
          const aw = sr.artworkNaturalSize.w * sr.artworkScale;
          const ah = sr.artworkNaturalSize.h * sr.artworkScale;
          // Track where the artwork actually landed as the new scale anchor.
          setIntendedCenter({
            x: sr.artworkPosition.x + aw / 2,
            y: sr.artworkPosition.y + ah / 2,
          });
          // Deselect the active template if the artwork was dragged away from
          // where the template placed it.
          if (sr.templateAnchorPosition && sr.activeTemplateId) {
            const dx = Math.abs(sr.artworkPosition.x - sr.templateAnchorPosition.x);
            const dy = Math.abs(sr.artworkPosition.y - sr.templateAnchorPosition.y);
            if (dx > 12 || dy > 12) {
              setActiveTemplateId(null);
              setTemplateAnchorPosition(null);
            }
          }
        }
      }
      dragRef.current.active = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragRef.current.active) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) applyDrag(touch.clientX, touch.clientY);
    }

    function onTouchEnd() {
      if (dragRef.current.active) {
        const sr = stateRef.current;
        if (sr.artworkNaturalSize) {
          const aw = sr.artworkNaturalSize.w * sr.artworkScale;
          const ah = sr.artworkNaturalSize.h * sr.artworkScale;
          setIntendedCenter({
            x: sr.artworkPosition.x + aw / 2,
            y: sr.artworkPosition.y + ah / 2,
          });
          if (sr.templateAnchorPosition && sr.activeTemplateId) {
            const dx = Math.abs(sr.artworkPosition.x - sr.templateAnchorPosition.x);
            const dy = Math.abs(sr.artworkPosition.y - sr.templateAnchorPosition.y);
            if (dx > 12 || dy > 12) {
              setActiveTemplateId(null);
              setTemplateAnchorPosition(null);
            }
          }
        }
      }
      dragRef.current.active = false;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [product]); // product is stable for the lifetime of this component

  // ── Recenter on print area switch ───────────────────────────────────────

  useEffect(() => {
    if (!artworkImage || !artworkNaturalSize) return;
    const area = product.printAreas[selectedPrintAreaIndex];
    if (!area) return;
    const { w: rw, h: rh } = getPrintAreaRect(area.widthIn, area.heightIn);

    // Reset to max scale so the artwork fills the new print area, then center it.
    setRelativeScale(100);
    const newMax = Math.min(
      rw / artworkNaturalSize.w,
      rh / artworkNaturalSize.h,
      1.5,
    );
    // Use newMax directly (not the state yet) so position is correct immediately.
    const aw = artworkNaturalSize.w * newMax;
    const ah = artworkNaturalSize.h * newMax;
    setArtworkPosition({
      x: Math.max(0, (rw - aw) / 2),
      y: Math.max(0, (rh - ah) / 2),
    });
    setActiveTemplateId(null);
    setTemplateAnchorPosition(null);
    setIntendedCenter(null);
    // Intentionally omits artworkNaturalSize — only fires when the area index
    // itself changes, not on image load or scale adjustments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrintAreaIndex]);

  // ── Event handlers ──────────────────────────────────────────────────────

  function startDrag(clientX: number, clientY: number) {
    if (!artworkImage || !artworkNaturalSize) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (CANVAS_SIZE / rect.width);
    const canvasY = (clientY - rect.top) * (CANVAS_SIZE / rect.height);

    const { x: rx, y: ry } = printAreaPx;
    const aw = artworkNaturalSize.w * actualScale;
    const ah = artworkNaturalSize.h * actualScale;
    const artLeft = rx + artworkPosition.x;
    const artTop = ry + artworkPosition.y;

    if (
      canvasX >= artLeft &&
      canvasX <= artLeft + aw &&
      canvasY >= artTop &&
      canvasY <= artTop + ah
    ) {
      dragRef.current.active = true;
      dragRef.current.startMouseX = clientX;
      dragRef.current.startMouseY = clientY;
      dragRef.current.startPosX = artworkPosition.x;
      dragRef.current.startPosY = artworkPosition.y;
    }
  }

  // Shared image loading logic used by both file input and drag-and-drop.
  function loadImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setArtworkDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        const area =
          product.printAreas[selectedPrintAreaIndex] ??
          product.printAreas[0] ??
          { widthIn: 12, heightIn: 16 };
        const { w: rw, h: rh } = getPrintAreaRect(area.widthIn, area.heightIn);

        // Normalize to ~85% of print area at scale 1.0 so maxAllowedScale
        // stays near 1.0–1.5 and all position math remains well-behaved.
        const fitScale = Math.min(
          (rw * 0.85) / img.width,
          (rh * 0.85) / img.height,
        );
        const naturalW = img.width * fitScale;
        const naturalH = img.height * fitScale;

        // Compute maxAllowedScale inline so we can position correctly now,
        // before the maxAllowedScale useEffect fires asynchronously.
        const newMax = Math.min(rw / naturalW, rh / naturalH, 1.5);
        const aw = naturalW * newMax;
        const ah = naturalH * newMax;

        setArtworkImage(img);
        setArtworkNaturalSize({ w: naturalW, h: naturalH });
        setRelativeScale(100);
        setArtworkPosition({
          x: Math.max(0, (rw - aw) / 2),
          y: Math.max(0, (rh - ah) / 2),
        });
        setIntendedCenter({ x: rw / 2, y: rh / 2 });
        setActiveTemplateId(null);
        setTemplateAnchorPosition(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    loadImageFile(file);
  }

  function clearArtwork() {
    setArtworkImage(null);
    setArtworkDataUrl(null);
    setArtworkNaturalSize(null);
    setRelativeScale(100);
    setArtworkPosition({ x: 0, y: 0 });
    setIntendedCenter(null);
    setActiveTemplateId(null);
    setTemplateAnchorPosition(null);
    setIsDragOver(false);
  }

  function applyTemplate(template: PlacementTemplate) {
    if (!artworkNaturalSize) return;

    const printW = selectedPrintArea.widthIn * INCH_PX;
    const printH = selectedPrintArea.heightIn * INCH_PX;

    // Scale to the template's target width, capped by the print area maximum.
    const targetPx = template.targetWidthIn * INCH_PX;
    const scaleByWidth = targetPx / artworkNaturalSize.w;
    const newActualScale = Math.min(scaleByWidth, maxAllowedScale);
    const newRelative = Math.max(1, Math.round((newActualScale / maxAllowedScale) * 100));

    const artW = artworkNaturalSize.w * newActualScale;
    const artH = artworkNaturalSize.h * newActualScale;

    // Calculate the desired artwork center in print-area-relative coordinates.
    let centerX: number;
    let centerY: number;

    if (template.anchorX === "left") {
      centerX = printW * template.offsetXPercent + artW / 2;
    } else if (template.anchorX === "right") {
      centerX = printW * (1 - template.offsetXPercent) - artW / 2;
    } else {
      centerX = printW / 2 + printW * template.offsetXPercent;
    }

    if (template.anchorY === "top") {
      centerY = printH * template.offsetYPercent + artH / 2;
    } else if (template.anchorY === "bottom") {
      centerY = printH * (1 - template.offsetYPercent) - artH / 2;
    } else {
      centerY = printH / 2 + printH * template.offsetYPercent;
    }

    // Top-left from center, clamped to print area bounds.
    const clampedX = Math.max(0, Math.min(printW - artW, centerX - artW / 2));
    const clampedY = Math.max(0, Math.min(printH - artH, centerY - artH / 2));

    setRelativeScale(newRelative);
    setArtworkPosition({ x: clampedX, y: clampedY });
    setActiveTemplateId(template.id);
    // Store the clamped position so drag deselection can compare against it.
    setTemplateAnchorPosition({ x: clampedX, y: clampedY });
    // Store the pre-clamp intended center so the scale slider anchors correctly
    // even when the artwork is pressed against a boundary.
    setIntendedCenter({ x: centerX, y: centerY });
  }

  function snapToCenter() {
    if (!artworkNaturalSize) return;
    const { w: rw, h: rh } = printAreaPx;
    const aw = artworkNaturalSize.w * actualScale;
    const ah = artworkNaturalSize.h * actualScale;
    setArtworkPosition({
      x: Math.max(0, (rw - aw) / 2),
      y: Math.max(0, (rh - ah) / 2),
    });
    setActiveTemplateId(null);
    setTemplateAnchorPosition(null);
    setIntendedCenter({ x: rw / 2, y: rh / 2 });
  }

  function handleScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRelative = parseInt(e.target.value, 10);

    if (!artworkNaturalSize) {
      setRelativeScale(newRelative);
      return;
    }

    const newActualScale = (newRelative / 100) * maxAllowedScale;
    const { w: rw, h: rh } = printAreaPx;
    const oldDrawW = artworkNaturalSize.w * actualScale;
    const oldDrawH = artworkNaturalSize.h * actualScale;

    // Use intendedCenter as the fixed anchor if one has been set (by a template,
    // snap-to-center, or drag end). This prevents drift when the artwork is
    // clamped to a boundary — the stored center is the pre-clamp logical
    // position, not the shifted visual position. Fall back to the current
    // visual center when no intended center has been established.
    const anchorX = intendedCenter?.x ?? (artworkPosition.x + oldDrawW / 2);
    const anchorY = intendedCenter?.y ?? (artworkPosition.y + oldDrawH / 2);

    const newDrawW = artworkNaturalSize.w * newActualScale;
    const newDrawH = artworkNaturalSize.h * newActualScale;

    setRelativeScale(newRelative);
    setArtworkPosition({
      x: Math.max(0, Math.min(Math.max(0, rw - newDrawW), anchorX - newDrawW / 2)),
      y: Math.max(0, Math.min(Math.max(0, rh - newDrawH), anchorY - newDrawH / 2)),
    });
    // intendedCenter is intentionally not updated here — it stays fixed as
    // the anchor for the full duration of slider interaction.
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
        >
          ← Back to product
        </button>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {product.brand}
          </p>
          <p className="mt-0.5 text-base font-semibold text-zinc-950">
            {product.name}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">

        {/* ── Left: canvas ── */}
        <div>
          <div className="mx-auto aspect-square w-full max-w-md">
            {/* Drag-and-drop wrapper — handles file drops onto the canvas */}
            <div
              className={`relative h-full w-full overflow-hidden rounded-xl transition-all ${
                isDragOver ? "ring-2 ring-zinc-950 ring-offset-2" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  loadImageFile(file);
                }
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-full w-full"
                style={{ cursor: artworkImage ? "move" : "default" }}
                onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (touch) startDrag(touch.clientX, touch.clientY);
                }}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              {artworkImage ? "Replace artwork" : "Upload artwork"}
            </button>
            {artworkImage && (
              <button
                type="button"
                onClick={clearArtwork}
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Remove artwork
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* ── Right: controls ── */}
        <div className="flex flex-col gap-6">

          {/* Print area info + selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Print area
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-zinc-950">
              {selectedPrintArea.name.replace(/_/g, " ")} —{" "}
              {selectedPrintArea.widthIn} × {selectedPrintArea.heightIn} in
            </p>

            {product.printAreas.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.printAreas.map((area, i) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setSelectedPrintAreaIndex(i)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                      selectedPrintAreaIndex === i
                        ? "bg-zinc-950 text-white"
                        : "border border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-950"
                    }`}
                  >
                    {area.name.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placement templates — only when artwork is loaded */}
          {artworkImage && visibleTemplates.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Quick placement
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {visibleTemplates.map((t) => {
                  const isActive = activeTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`rounded-md border px-2 py-2 text-left transition ${
                        isActive
                          ? "border-zinc-950 bg-zinc-950"
                          : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-800"}`}>
                        {t.label}
                      </p>
                      <p className={`mt-0.5 text-[10px] leading-tight ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Snap to center — only when artwork is loaded */}
          {artworkImage && (
            <button
              type="button"
              onClick={snapToCenter}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              ⊕ Snap to center
            </button>
          )}

          {/* Grid overlay toggle — always visible */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="h-3.5 w-3.5 accent-zinc-950"
            />
            <span className="text-xs text-zinc-600">Show placement grid</span>
          </label>

          {/* Artwork scale slider — relative 1–100% where 100 fills the print area */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Artwork size
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="w-6 shrink-0 text-right text-xs text-zinc-400">
                1%
              </span>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={relativeScale}
                onChange={handleScaleChange}
                disabled={!artworkImage}
                className="flex-1 accent-zinc-950 disabled:opacity-40"
              />
              <span className="w-10 shrink-0 text-xs text-zinc-400">
                100%
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {relativeScale}%
              {!artworkImage && (
                <span className="ml-1 text-zinc-300">
                  — upload artwork to enable
                </span>
              )}
            </p>
            {isAtSizeCap && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                ⚠ Image scaled to fit print area
              </p>
            )}
          </div>

          {/* Garment color selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Garment color
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.availableColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  title={color.name}
                  onClick={() => setSelectedColorHex(color.hex)}
                  className={`h-7 w-7 rounded-full border transition ${
                    selectedColorHex === color.hex
                      ? "ring-2 ring-zinc-950 ring-offset-2"
                      : "hover:ring-2 hover:ring-zinc-300 hover:ring-offset-1"
                  }`}
                  style={{
                    backgroundColor: color.hex,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Approve button + disclaimer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                const snapshotUrl = canvas
                  ? canvas.toDataURL("image/jpeg", 0.6)
                  : "";
                const templateLabel = activeTemplateId
                  ? (PLACEMENT_TEMPLATES.find((t) => t.id === activeTemplateId)?.label ?? null)
                  : null;
                onApprove(artworkDataUrl, snapshotUrl, selectedPrintArea.name, templateLabel);
              }}
              className="h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
            >
              Approve design →
            </button>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Artwork placement is approximate. Final print file will be
              confirmed with your provider.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
