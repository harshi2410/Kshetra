/**
 * Geographic projection and geometry math utilities for Land OS Satellite Boundary.
 * Provides high-precision bijective mapping between Earth geographic coordinates (lat, lng)
 * and local 2D Euclidean / CAD coordinates (feet / meters) for UDCPR compliance and plot generation.
 */

const FEET_PER_METER = 3.2808399;
const METERS_PER_DEG_LAT = 111139.0;

// Common Maharashtra and Indian City Geocodes for immediate fallback
const KNOWN_GEOCODES = {
  pune: [18.5204, 73.8567],
  mumbai: [19.0760, 72.8777],
  thane: [19.2183, 72.9781],
  'navi mumbai': [19.0330, 73.0297],
  nagpur: [21.1458, 79.0882],
  nashik: [19.9975, 73.7898],
  aurangabad: [19.8762, 75.3433],
  'chhatrapati sambhajinagar': [19.8762, 75.3433],
  solapur: [17.6599, 75.9064],
  kolhapur: [16.7050, 74.2433],
  satara: [17.6805, 74.0183],
  amravati: [20.9374, 77.7796],
  nanded: [19.1383, 77.3210],
  delhi: [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.3850, 78.4867],
};

/**
 * Resolves map center coordinates from project location fields.
 */
export function resolveProjectLocation(project) {
  const loc = project?.locationDetails || {};
  if (loc.latitude && loc.longitude) {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng, zoom: 17, source: 'project_coords' };
    }
  }

  // Parse text location
  const fullText = `${project?.name || ''} ${project?.location || ''} ${loc.cityVillage || ''} ${loc.district || ''} ${loc.taluka || ''} ${loc.state || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_GEOCODES)) {
    if (fullText.includes(key)) {
      return { lat: coords[0], lng: coords[1], zoom: 17, source: `matched_${key}` };
    }
  }

  // Default to Pune, Maharashtra (LandOS primary testbed)
  return { lat: 18.5204, lng: 73.8567, zoom: 17, source: 'default_pune' };
}

/**
 * Checks if a polygon contains any self-intersecting line segments.
 */
export function checkPolygonSelfIntersection(points) {
  if (!points || points.length < 4) return { hasIntersection: false };

  const n = points.length;
  const isClosed = points[0][0] === points[n - 1][0] && points[0][1] === points[n - 1][1];
  const pts = isClosed ? points.slice(0, -1) : points;
  const m = pts.length;
  if (m < 4) return { hasIntersection: false };

  function ccw(A, B, C) {
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
  }
  function intersect(A, B, C, D) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
  }

  for (let i = 0; i < m; i++) {
    const A = pts[i];
    const B = pts[(i + 1) % m];
    for (let j = i + 1; j < m; j++) {
      // Skip adjacent segments (they meet at shared vertex)
      if (Math.abs(i - j) <= 1 || (i === 0 && j === m - 1)) continue;
      const C = pts[j];
      const D = pts[(j + 1) % m];
      if (intersect(A, B, C, D)) {
        return {
          hasIntersection: true,
          segment1Index: i + 1,
          segment2Index: j + 1,
          message: `Self-intersection detected: Edge ${i + 1} crosses Edge ${j + 1}. Please adjust boundary points so edges do not cross.`
        };
      }
    }
  }

  return { hasIntersection: false };
}

/**
 * Converts array of [lat, lng] points into planar metric & CAD feet coordinates.
 */
export function geoPolygonToCadPolygon(geoPoints) {
  if (!geoPoints || geoPoints.length < 3) {
    return {
      cadPolygon: [],
      refCenter: null,
      areaSqm: 0,
      areaSqft: 0,
      perimeterM: 0,
      perimeterFt: 0,
      lengthFt: 0,
      breadthFt: 0
    };
  }

  // Remove duplicate closing point if present
  let pts = [...geoPoints];
  if (pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts = pts.slice(0, -1);
  }

  let sumLat = 0;
  let sumLng = 0;
  pts.forEach(([lat, lng]) => {
    sumLat += lat;
    sumLng += lng;
  });
  const refLat = sumLat / pts.length;
  const refLng = sumLng / pts.length;

  const cosLat = Math.cos((refLat * Math.PI) / 180.0);
  const metersPerDegLng = METERS_PER_DEG_LAT * cosLat;

  // Convert to relative meters from reference center
  const relativeMeters = pts.map(([lat, lng]) => {
    const xM = (lng - refLng) * metersPerDegLng;
    const yM = (lat - refLat) * METERS_PER_DEG_LAT;
    return [xM, yM];
  });

  // Calculate area via Shoelace formula in square meters
  let areaSqm = 0;
  let perimeterM = 0;
  const n = relativeMeters.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = relativeMeters[i];
    const [x2, y2] = relativeMeters[(i + 1) % n];
    areaSqm += (x1 * y2) - (x2 * y1);
    perimeterM += Math.hypot(x2 - x1, y2 - y1);
  }
  areaSqm = Math.abs(areaSqm) / 2.0;
  const areaSqft = areaSqm * 10.7639104;
  const perimeterFt = perimeterM * FEET_PER_METER;

  // Convert to feet and pad so all coordinates are positive
  const xsFt = relativeMeters.map(p => p[0] * FEET_PER_METER);
  const ysFt = relativeMeters.map(p => p[1] * FEET_PER_METER);
  const minX = Math.min(...xsFt);
  const maxX = Math.max(...xsFt);
  const minY = Math.min(...ysFt);
  const maxY = Math.max(...ysFt);

  const lengthFt = Math.max(50, Math.round(maxX - minX));
  const breadthFt = Math.max(50, Math.round(maxY - minY));

  // Shift to start at (20, 20) with clean rounding
  const cadPolygon = relativeMeters.map(p => {
    const x = Math.round((p[0] * FEET_PER_METER - minX + 20) * 10) / 10;
    const y = Math.round((p[1] * FEET_PER_METER - minY + 20) * 10) / 10;
    return [x, y];
  });

  return {
    cadPolygon,
    refCenter: {
      lat: refLat,
      lng: refLng,
      cosLat,
      minX,
      minY
    },
    areaSqm: Math.round(areaSqm),
    areaSqft: Math.round(areaSqft),
    perimeterM: Math.round(perimeterM),
    perimeterFt: Math.round(perimeterFt),
    lengthFt,
    breadthFt
  };
}

/**
 * Projects a local CAD (x_ft, y_ft) coordinate back to geographic [lat, lng].
 */
export function cadPointToGeoPoint(xFt, yFt, refCenter) {
  if (!refCenter) return null;
  const metersPerDegLng = METERS_PER_DEG_LAT * refCenter.cosLat;

  const origXFt = xFt - 20 + refCenter.minX;
  const origYFt = yFt - 20 + refCenter.minY;

  const xMeters = origXFt / FEET_PER_METER;
  const yMeters = origYFt / FEET_PER_METER;

  const lng = refCenter.lng + (xMeters / metersPerDegLng);
  const lat = refCenter.lat + (yMeters / METERS_PER_DEG_LAT);

  return [lat, lng];
}

/**
 * Projects an array of CAD points back to geographic [[lat, lng], ...].
 */
export function cadPolygonToGeoPolygon(cadPoints, refCenter) {
  if (!cadPoints || !refCenter) return [];
  return cadPoints.map(pt => {
    const x = Array.isArray(pt) ? pt[0] : (pt.x !== undefined ? pt.x : 0);
    const y = Array.isArray(pt) ? pt[1] : (pt.y !== undefined ? pt.y : 0);
    return cadPointToGeoPoint(x, y, refCenter);
  });
}
