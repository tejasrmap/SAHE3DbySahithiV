# SAHE3D System Architecture & Engineering Design

## 1. Architectural Overview

SAHE3D v2.0 is structured into clean, decoupled domains separating GIS mathematics, 3D WebGL rendering, physical collision, pedestrian graph routing, user preferences storage, and presentation UI.

```
src/
├── main.ts                       # Application bootstrap & unified render loop
├── styles/
│   └── app.css                   # Glassmorphic responsive styling & theme variables
├── gis/
│   └── coordinateConverter.ts     # WGS84 <-> Three.js metric projection engine
├── data/
│   ├── campus-boundary.json      # Verified perimeter polygon
│   ├── buildings.json            # 11 major campus buildings with footprints & metadata
│   ├── pois.json                 # 10 verified landmarks, statues & service amenities
│   ├── campus-roads.json         # Highway, avenue, and walkway coordinates
│   ├── pedestrian-graph.json     # Graph nodes and edges for Dijkstra routing
│   └── campus.geojson            # Unified GeoJSON FeatureCollection
├── scene/
│   ├── materials.ts              # Procedural texture manager & material cache
│   ├── environment.ts            # Ground, roads, foliage, streetlamps, traffic, weather
│   └── lightingSystem.ts         # Sun trajectory, sky blending, and day/night cycle
├── buildings/
│   └── buildingGenerator.ts      # Procedural multi-storey architecture & AABB collision boxes
├── camera/
│   ├── cameraManager.ts          # Smooth tweening presets & orbit limits
│   └── firstPersonController.ts  # WASD eye-level walking with AABB collision prevention
├── navigation/
│   └── pedestrianRouter.ts       # Dijkstra shortest path & 3D neon route line
├── tours/
│   └── tourController.ts         # 8-stop cinematic tour with Catmull-Rom spline orbit
├── storage/
│   └── userPreferences.ts        # XSS-sanitized versioned localStorage manager
└── ui/
    └── uiManager.ts              # DOM-safe UI bindings (Search, Directory, Toolbar, Modals)
```

## 2. Geospatial Local Tangent Plane Projection

Instead of relying on arbitrary screenshot-pixel functions (`W`, `P1`, `P2`, `P3`), SAHE3D anchors the campus at the official institutional origin:
- **Latitude:** `16.4842° N`
- **Longitude:** `80.6928° E`
- **Scale Factor:** `2.12 meters per scene unit`

```typescript
const dLat = lat - 16.4842;
const dLon = lon - 80.6928;
const sceneX = (dLon * 106740.0) / 2.12;
const sceneZ = -(dLat * 110650.0) / 2.12;
```

This ensures metric distance fidelity for accurate walking times and routing estimates.
