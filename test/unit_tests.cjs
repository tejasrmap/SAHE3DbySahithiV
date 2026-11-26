/**
 * Automated Unit Test Suite for SAHE3D Campus Explorer
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- 1. GIS & Coordinate Conversion Tests ---');

const CAMPUS_ORIGIN = { lat: 16.4842, lon: 80.6928 };
const METERS_PER_LAT_DEGREE = 110650.0;
const METERS_PER_LON_DEGREE = 106740.0;
const METERS_PER_SCENE_UNIT = 2.12;

function latLonToScene(lat, lon) {
  const dLat = lat - CAMPUS_ORIGIN.lat;
  const dLon = lon - CAMPUS_ORIGIN.lon;
  const eastMeters = dLon * METERS_PER_LON_DEGREE;
  const northMeters = dLat * METERS_PER_LAT_DEGREE;
  return [eastMeters / METERS_PER_SCENE_UNIT, -northMeters / METERS_PER_SCENE_UNIT];
}

function sceneToLatLon(x, z) {
  const eastMeters = x * METERS_PER_SCENE_UNIT;
  const northMeters = -z * METERS_PER_SCENE_UNIT;
  const lat = CAMPUS_ORIGIN.lat + northMeters / METERS_PER_LAT_DEGREE;
  const lon = CAMPUS_ORIGIN.lon + eastMeters / METERS_PER_LON_DEGREE;
  return [parseFloat(lat.toFixed(6)), parseFloat(lon.toFixed(6))];
}

it('Origin lat/lon converts exactly to scene [0, 0]', () => {
  const [x, z] = latLonToScene(16.4842, 80.6928);
  assert.ok(Math.abs(x) < 0.0001, `Expected x near 0, got ${x}`);
  assert.ok(Math.abs(z) < 0.0001, `Expected z near 0, got ${z}`);
});

it('Coordinate roundtrip (lat/lon -> scene -> lat/lon) preserves precision', () => {
  const testLat = 16.4848;
  const testLon = 80.6921;
  const [x, z] = latLonToScene(testLat, testLon);
  const [roundLat, roundLon] = sceneToLatLon(x, z);
  assert.ok(Math.abs(roundLat - testLat) < 0.00005, `Lat error: ${roundLat} vs ${testLat}`);
  assert.ok(Math.abs(roundLon - testLon) < 0.00005, `Lon error: ${roundLon} vs ${testLon}`);
});

function isInsideCampusBoundary(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const boundaryData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/campus-boundary.json'), 'utf8'));
const boundaryCoords = boundaryData.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);

it('Campus center (16.4842, 80.6928) is inside campus perimeter', () => {
  const inside = isInsideCampusBoundary(16.4842, 80.6928, boundaryCoords);
  assert.strictEqual(inside, true);
});

it('External coordinates outside campus boundary are rejected', () => {
  const outside = isInsideCampusBoundary(16.5000, 80.7200, boundaryCoords);
  assert.strictEqual(outside, false);
});

console.log('\n--- 2. Campus Datasets Validation Tests ---');

const buildings = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/buildings.json'), 'utf8'));
const pois = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pois.json'), 'utf8'));
const roads = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/campus-roads.json'), 'utf8'));
const graph = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pedestrian-graph.json'), 'utf8'));

it('All building records have valid identifiers and required fields', () => {
  assert.ok(buildings.length >= 10, 'Expected at least 10 campus buildings');
  buildings.forEach(b => {
    assert.ok(b.id, `Missing id: ${JSON.stringify(b)}`);
    assert.ok(b.name, `Missing name in ${b.id}`);
    assert.ok(b.category, `Missing category in ${b.id}`);
    assert.ok(b.lat && b.lon, `Missing lat/lon in ${b.id}`);
    assert.ok(b.dimensions && b.dimensions.length === 3, `Invalid dimensions in ${b.id}`);
    assert.ok(b.accuracy, `Missing accuracy classification in ${b.id}`);
  });
});

it('All POI records contain required spatial properties', () => {
  assert.ok(pois.length >= 10, 'Expected at least 10 campus POIs');
  pois.forEach(p => {
    assert.ok(p.id, `Missing POI id: ${JSON.stringify(p)}`);
    assert.ok(p.name, `Missing POI name in ${p.id}`);
    assert.ok(p.lat && p.lon, `Missing lat/lon in ${p.id}`);
    assert.ok(p.accuracy, `Missing accuracy tag in ${p.id}`);
  });
});

console.log('\n--- 3. Pedestrian Routing Graph Tests ---');

it('Graph has valid nodes and bidirectional connectivity', () => {
  assert.ok(graph.nodes.length >= 12, 'Expected at least 12 graph nodes');
  assert.ok(graph.edges.length >= 14, 'Expected at least 14 graph edges');

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  graph.edges.forEach(e => {
    assert.ok(nodeIds.has(e.from), `Unknown from node: ${e.from}`);
    assert.ok(nodeIds.has(e.to), `Unknown to node: ${e.to}`);
    assert.ok(e.distance > 0, `Invalid distance: ${e.distance}`);
  });
});

// Dijkstra implementation test
function testDijkstra(startId, destId) {
  const adj = new Map();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    adj.get(e.from).push({ to: e.to, d: e.distance });
    adj.get(e.to).push({ to: e.from, d: e.distance });
  });

  const dist = new Map();
  const prev = new Map();
  const unvisited = new Set(graph.nodes.map(n => n.id));

  graph.nodes.forEach(n => dist.set(n.id, Infinity));
  dist.set(startId, 0);

  while (unvisited.size > 0) {
    let curr = null;
    let minD = Infinity;
    unvisited.forEach(id => {
      if (dist.get(id) < minD) {
        minD = dist.get(id);
        curr = id;
      }
    });
    if (!curr || minD === Infinity) break;
    if (curr === destId) break;
    unvisited.delete(curr);

    adj.get(curr).forEach(edge => {
      if (!unvisited.has(edge.to)) return;
      const alt = minD + edge.d;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, curr);
      }
    });
  }

  const path = [];
  let step = destId;
  while (step) {
    path.unshift(step);
    step = prev.get(step);
    if (step === startId) {
      path.unshift(startId);
      break;
    }
  }
  return { path, totalDistance: dist.get(destId) };
}

it('Route from Main Gate to CSE Complex computes valid path', () => {
  const route = testDijkstra('n-main-gate', 'n-cse-entrance');
  assert.ok(route.path.length >= 3, `Expected path length >= 3, got ${route.path.length}`);
  assert.strictEqual(route.path[0], 'n-main-gate');
  assert.strictEqual(route.path[route.path.length - 1], 'n-cse-entrance');
  assert.ok(route.totalDistance > 0 && route.totalDistance < 300, `Unexpected distance: ${route.totalDistance}`);
});

it('Route from Main Gate to Boys Hostel connects successfully', () => {
  const route = testDijkstra('n-main-gate', 'n-hostel-entrance');
  assert.ok(route.path.length >= 4);
  assert.strictEqual(route.path[0], 'n-main-gate');
  assert.strictEqual(route.path[route.path.length - 1], 'n-hostel-entrance');
});

console.log('\n--- 4. XSS Sanitization & Data Safety Tests ---');

function sanitize(str) {
  return str
    .replace(/[<>'"&]/g, (match) => {
      const escapeMap = { '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' };
      return escapeMap[match] || '';
    })
    .trim()
    .slice(0, 60);
}

it('Sanitization neutralizes script tags and HTML injection', () => {
  const malicious = '<script>alert("xss")</script>';
  const clean = sanitize(malicious);
  assert.ok(!clean.includes('<script>'), 'Failed to escape script tag');
  assert.strictEqual(clean, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

it('Sanitization enforces 60-character maximum length limit', () => {
  const longStr = 'A'.repeat(120);
  const clean = sanitize(longStr);
  assert.strictEqual(clean.length, 60);
});

console.log(`\n========================================`);
console.log(`Unit Tests Summary: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
