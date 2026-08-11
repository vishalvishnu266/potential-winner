/**
 * Great-circle bearing helpers.
 * Pure math, no side effects — safe to import anywhere.
 */

/** Bearing in degrees clockwise from north (0..360). */
export function bearingDeg(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Compass letter for a bearing (N, NE, E, SE, S, SW, W, NW). */
export function compassLetter(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
