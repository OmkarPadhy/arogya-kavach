/**
 * Maps real-world coordinates onto the virtual environment coordinate system.
 *
 * Latitude/longitude can never be used directly as Three.js coordinates, so
 * the site declares an origin and a metres-per-degree scale. Today the mock
 * data already carries x/y/z, but when live GPS arrives this is the only
 * place that needs to change.
 */

export interface SiteOrigin {
  latitude: number;
  longitude: number;
  /** Virtual units per degree of latitude / longitude. */
  unitsPerDegLat: number;
  unitsPerDegLng: number;
}

export const siteOrigin: SiteOrigin = {
  latitude: 20.2965,
  longitude: 85.8252,
  unitsPerDegLat: 9000,
  unitsPerDegLng: 8400,
};

export function geoToScene(
  latitude: number | null,
  longitude: number | null,
  origin: SiteOrigin = siteOrigin,
): { x: number; z: number } | null {
  if (latitude === null || longitude === null) return null;
  return {
    x: (longitude - origin.longitude) * origin.unitsPerDegLng,
    z: -(latitude - origin.latitude) * origin.unitsPerDegLat,
  };
}

export function formatCoordinate(value: number | null, axis: "lat" | "lng") {
  if (value === null) return "—";
  const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`;
}
