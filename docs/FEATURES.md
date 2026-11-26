# SAHE3D Features Specification

## 1. Real-Time Search & Exploration
- **Search Capabilities:** Instant matching on building names, department tags, laboratory names, facilities, and categories.
- **Filter Chips:** 8 category filters with active state indicators.
- **Directory Sidebar:** Collapsible accordion listing all 25+ verified campus points of interest with star favorite toggling.

## 2. First-Person Walk Mode
- **Height:** 1.75 meters (natural human eye level).
- **Controls:** `W`, `A`, `S`, `D` or `Arrow Keys` for lateral movement; `Shift` for sprint.
- **Orientation:** Mouse drag or touch swipe look around.
- **Collision Engine:** Active Axis-Aligned Bounding Box (AABB) collision prevents walking through buildings or outside campus boundaries.

## 3. Pedestrian Routing
- **Algorithm:** Dijkstra shortest path on 15 walkable pedestrian path segments.
- **Metrics:** Total walking distance in meters, estimated walking duration in minutes.
- **Visuals:** 3D cyan neon dashed line rendered on the ground surface.

## 4. Cinematic Campus Tour
- **Tour Stops:** 8 landmark locations.
- **Controls:** Play, Pause, Next, Previous, and Exit.
- **HUD:** Real-time captioning and stop counter.

## 5. Lighting, Weather & Season Simulation
- **Lighting:** Astronomical sun trajectory matching Vijayawada latitude (`16.48° N`), live clock mode, manual hour slider, 6 presets.
- **Weather:** Clear sky, 3D procedural cumulus clouds, atmospheric mist/fog, and 1,200 particle rain.
- **Seasons:** Dynamic seasonal foliage and terrain adaptation for Summer, Monsoon, Autumn, and Winter.
