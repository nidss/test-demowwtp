import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";

// ─── Sources ─────────────────────────────────────────────────────────────────
//
// We fetch from jsDelivr's mirror of cvibhagool/thailand-map, which serves
// the same content as raw.githubusercontent.com but with proper CDN caching
// and CORS headers. The provinces.topojson variant is ~500 KB (vs ~24 MB
// for the GeoJSON) but renders identically — perfect for a one-time fetch.
//
// Fallback to the raw GeoJSON if TopoJSON ever 404s; the topology version
// has been stable since 2017 so this is purely defensive.

const SOURCES = [
  "https://cdn.jsdelivr.net/gh/cvibhagool/thailand-map@master/thailand-provinces.topojson",
  "https://cdn.jsdelivr.net/gh/cvibhagool/thailand-map@master/thailand-provinces.geojson",
];

// Cache key includes a version suffix so we can bust the cache without
// changing the data source. Bump if PROVINCE_TO_REGION mapping changes.
const CACHE_KEY = "scada.thailand-geojson.v1";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProvincesFC = FeatureCollection<Geometry, Record<string, unknown>>;

interface CacheEntry {
  ts: number;
  data: ProvincesFC;
}

interface State {
  data: ProvincesFC | null;
  loading: boolean;
  error: string | null;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Detects whether a JSON blob is TopoJSON (has `type === "Topology"`) or
 * GeoJSON (has `type === "FeatureCollection"`), and normalises to a
 * FeatureCollection so callers don't need to care.
 */
function normalise(json: unknown): ProvincesFC {
  if (!json || typeof json !== "object") {
    throw new Error("Map data is not a JSON object");
  }
  const obj = json as { type?: string; objects?: Record<string, unknown> };

  if (obj.type === "Topology" && obj.objects) {
    const topo = obj as unknown as Topology;
    // Pick the first object — these files only contain one province layer.
    const firstKey = Object.keys(topo.objects)[0];
    if (!firstKey) throw new Error("TopoJSON has no objects");
    const fc = feature(topo, topo.objects[firstKey] as GeometryCollection);
    if (Array.isArray(fc)) {
      throw new Error("Unexpected array from topojson feature()");
    }
    return fc as unknown as ProvincesFC;
  }

  if (obj.type === "FeatureCollection") {
    return obj as unknown as ProvincesFC;
  }

  throw new Error(`Unsupported map data type: ${obj.type ?? "unknown"}`);
}

async function fetchProvinces(): Promise<ProvincesFC> {
  let lastErr: unknown = null;
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) {
        lastErr = new Error(`${url}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      return normalise(json);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All map sources failed");
}

function loadCached(): ProvincesFC | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    // 90-day cache — borders almost never change but a refresh occasionally
    // catches upstream fixes.
    if (Date.now() - entry.ts > 90 * 24 * 60 * 60 * 1000) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function saveCached(data: ProvincesFC) {
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    // Quota exceeded or storage disabled — fine to swallow; we just refetch
    // next time.
    console.warn("[thailand-geojson] cache save failed:", err);
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Loads Thailand's province polygons from a CDN on first call, caching the
 * result in localStorage. Subsequent calls (or page reloads) return cached
 * data synchronously so the map renders instantly.
 *
 * Returns `{ data, loading, error }` so callers can show a skeleton during
 * the initial network round-trip.
 */
export function useThailandGeoJson(): State {
  const [state, setState] = useState<State>(() => {
    // Synchronous cache lookup on first render — avoids a flash when the
    // data is already available locally.
    const cached = typeof window !== "undefined" ? loadCached() : null;
    return {
      data: cached,
      loading: !cached,
      error: null,
    };
  });

  useEffect(() => {
    if (state.data) return; // already loaded from cache
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchProvinces();
        if (cancelled) return;
        saveCached(data);
        setState({ data, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => { cancelled = true; };
    // We only want to attempt the fetch once per mount; state.data is the
    // signal that we already have what we need.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
