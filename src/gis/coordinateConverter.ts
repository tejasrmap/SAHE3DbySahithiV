/**
 * Centralized GIS Coordinate Transformation Engine
 * WGS84 (EPSG:4326) <-> Three.js Local Tangent Plane Projection (Meters)
 * Siddhartha Academy of Higher Education (SAHE), Kanuru, Vijayawada
 */

export type AccuracyLevel = 'VERIFIED' | 'SOURCE-BASED' | 'APPROXIMATE' | 'PROCEDURAL' | 'UNVERIFIED';

export interface GeoPoint {
  lat: number;
  lon: number;
  elevation?: number;
}

export interface ScenePoint {
  x: number;
  z: number;
  y?: number;
}

// Campus Reference Origin (Center of SAHE Kanuru Main Campus)
export const CAMPUS_ORIGIN: GeoPoint = {
  lat: 16.4842,
  lon: 80.6928,
  elevation: 19.0
};

// Earth radius & meters per degree at 16.4842° N
const EARTH_RADIUS_METERS = 6378137.0;
const METERS_PER_LAT_DEGREE = 110650.0;
const METERS_PER_LON_DEGREE = 106740.0; // 111320 * cos(16.4842°)

// Calibrated scaling between metric scene space and visual model units
// 1 Three.js scene unit = 2.0 meters (or 1:1 if unscaled)
export const METERS_PER_SCENE_UNIT = 2.12;

/**
 * Converts WGS84 Latitude & Longitude to Local Three.js Scene Coordinates (X, Z)
 * In Three.js: +X is East, -Z is North, +Y is Elevation (Up)
 */
export function latLonToScene(lat: number, lon: number): [number, number] {
  const dLat = lat - CAMPUS_ORIGIN.lat;
  const dLon = lon - CAMPUS_ORIGIN.lon;

  const eastMeters = dLon * METERS_PER_LON_DEGREE;
  const northMeters = dLat * METERS_PER_LAT_DEGREE;

  // Scene X = East / scale; Scene Z = -North / scale (Three.js right-hand coordinate system)
  const sceneX = eastMeters / METERS_PER_SCENE_UNIT;
  const sceneZ = -northMeters / METERS_PER_SCENE_UNIT;

  return [sceneX, sceneZ];
}

/**
 * Converts Local Three.js Scene Coordinates (X, Z) back to WGS84 Latitude & Longitude
 */
export function sceneToLatLon(x: number, z: number): [number, number] {
  const eastMeters = x * METERS_PER_SCENE_UNIT;
  const northMeters = -z * METERS_PER_SCENE_UNIT;

  const lat = CAMPUS_ORIGIN.lat + northMeters / METERS_PER_LAT_DEGREE;
  const lon = CAMPUS_ORIGIN.lon + eastMeters / METERS_PER_LON_DEGREE;

  return [parseFloat(lat.toFixed(6)), parseFloat(lon.toFixed(6))];
}

/**
 * Great-circle distance between two geographic points in meters (Haversine Formula)
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Euclidean distance in 2D scene space converted to meters
 */
export function sceneDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];
  return Math.hypot(dx, dz) * METERS_PER_SCENE_UNIT;
}

/**
 * Bearing angle from p1 to p2 in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Validates whether a coordinate lies within the SAHE Kanuru campus perimeter polygon
 */
export function isInsideCampusBoundary(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];

    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
