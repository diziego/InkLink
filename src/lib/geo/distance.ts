/**
 * Real ZIP-to-ZIP distance for InkLink routing.
 *
 * Geocoding: zippopotam.us (free, no API key, US ZIP → lat/lng).
 * Distance: Haversine formula (straight-line miles).
 * Cache: module-level Map — persists across warm serverless invocations,
 *        resets on cold start (acceptable for v1).
 *
 * Usage: call precomputeDistances() before running the routing engine.
 * estimateMockDistanceMiles() in mock-calculations.ts checks this cache
 * first, then falls back to the mock lookup table.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type ZipCoords = { lat: number; lng: number };

// ─── Module-level caches ──────────────────────────────────────────────────────

const coordsCache = new Map<string, ZipCoords | null>();
const distanceCache = new Map<string, number>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the cached distance in miles between two ZIPs, or null if not yet
 * computed. Called synchronously by the routing engine.
 */
export function getCachedDistanceMiles(
  zip1: string,
  zip2: string,
): number | null {
  return (
    distanceCache.get(`${zip1}:${zip2}`) ??
    distanceCache.get(`${zip2}:${zip1}`) ??
    null
  );
}

/**
 * Pre-fetches lat/lng for the merchant ZIP and all provider ZIPs in parallel,
 * then stores haversine distances in the module-level cache. Call this once
 * before running the routing engine so distances are available synchronously.
 *
 * Silently swallows errors — if geocoding fails the routing engine falls back
 * to the mock lookup table.
 */
export async function precomputeDistances(
  merchantZip: string,
  providerZips: string[],
): Promise<void> {
  const uniqueZips = Array.from(new Set([merchantZip, ...providerZips]));

  // Fetch coords for all unique ZIPs in parallel (skip already cached)
  await Promise.all(
    uniqueZips.map(async (zip) => {
      if (coordsCache.has(zip)) return;
      const coords = await fetchZipCoords(zip);
      coordsCache.set(zip, coords);
    }),
  );

  const merchantCoords = coordsCache.get(merchantZip);
  if (!merchantCoords) return;

  for (const providerZip of providerZips) {
    const key = `${merchantZip}:${providerZip}`;
    if (distanceCache.has(key)) continue;
    const providerCoords = coordsCache.get(providerZip);
    if (!providerCoords) continue;
    const miles = haversineDistanceMiles(
      merchantCoords.lat,
      merchantCoords.lng,
      providerCoords.lat,
      providerCoords.lng,
    );
    distanceCache.set(key, Math.round(miles));
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetches lat/lng for a US ZIP from zippopotam.us.
 * Free API — no key required. Returns null on any error.
 */
async function fetchZipCoords(zip: string): Promise<ZipCoords | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      next: { revalidate: 86400 }, // cache for 24h in Next.js fetch cache
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      places: Array<{ latitude: string; longitude: string }>;
    };
    const place = data.places[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
}

/**
 * Haversine formula — returns straight-line distance in miles between
 * two lat/lng coordinates.
 */
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3_958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
