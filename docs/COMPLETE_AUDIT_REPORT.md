# SAHE3D Campus Explorer — Complete Comprehensive Audit Report

**Project:** SAHE Kanuru in 3D / SAHE3D Campus Explorer  
**Original Author:** Dr. Veeramallu Satya Sahithi  
**Repository:** [github.com/tejasrmap/SAHE3DbySahithiV](https://github.com/tejasrmap/SAHE3DbySahithiV)  
**Location:** Siddhartha Academy of Higher Education (SAHE), Kanuru, Vijayawada, Andhra Pradesh, India (`16.4842° N, 80.6928° E`)  
**Audit Date:** November 2026  
**Auditor:** Senior Full-Stack & GIS Systems Engineer

---

## Executive Summary

The **SAHE Kanuru in 3D** project is an interactive 3D WebGL web application originally implemented as a standalone single-file `index.html` (~657 lines) utilizing Three.js r128 and OrbitControls. It proceduralizes the campus of Siddhartha Academy of Higher Education (VR Siddhartha Engineering College campus at Kanuru) with custom building extrusions, simulated lighting, dynamic seasons, animated traffic/pedestrians, and a cinematic campus tour.

While the original application displays remarkable creativity and an impressive set of visual features within a single file, it suffers from severe architectural, geospatial, security, performance, and accessibility limitations that prevent it from serving as a production-grade campus digital twin.

This audit evaluates the codebase across 25 dimensions and outlines the complete modernization and rectification strategy.

---

## 1. Issue Classification & Severity Matrix

| Severity | Count | Primary Impact Areas |
| :--- | :---: | :--- |
| **Critical** | 4 | Security (XSS in search/storage), lack of real GIS coordinates, missing error/WebGL fallback, no collision prevention in walk mode |
| **High** | 7 | Fragmented screenshot pixel coordinate system, monolithic code architecture, lack of true pedestrian routing, fragile tour interruption, missing mobile responsiveness, unversioned storage |
| **Medium** | 9 | High draw calls, non-instanced road/building geometry, CPU-bound particle rain, lack of LOD, missing keyboard accessibility, hardcoded building metadata, unvalidated renaming |
| **Low** | 5 | Inconsistent visual styling, lack of user favorites, fixed time-of-day step sizes, missing layer toggles, uncurated POI descriptions |

---

## 2. Detailed Findings

### 2.1 Security & Data Integrity (Critical)
1. **Stored Cross-Site Scripting (XSS) via Search Results:**
   - In `index.html` line 636:
     ```javascript
     m.forEach(x => {
       const d = document.createElement('div');
       d.innerHTML = x[0][0] + '<span>' + CAT[x[0][1]][0] + '</span>';
       ...
     });
     ```
   - In `index.html` line 541: Place names are stored in `localStorage.getItem('sahe-names')` without validation or HTML sanitization. If malicious content is injected via developer tools or shared storage, searching will execute arbitrary JavaScript.
2. **Unsafe HTML Injection in Fallback States:**
   - Line 637: `res.innerHTML = '<div>No match. Try “hostel”, “library” or “canteen”.</div>'` uses `innerHTML` instead of safe DOM element generation.
3. **Unchecked Storage Deserialization:**
   - JSON parsing of localStorage lacks schema validation and version checks, risking application startup crashes if the stored string is corrupted.

### 2.2 Geospatial & Coordinate Systems (Critical / High)
1. **Screenshot-Pixel Coordinate Mapping (`W`, `P1`, `P2`, `P3`):**
   - The scene relies on arbitrary pixel mappings:
     ```javascript
     const W = p => [(p[0] - 743) / 8, (p[1] - 470) / 8];
     const P1 = (x, y) => [432 + (x - 177) * .294, 216 + (y - 252) * .294];
     const P2 = (x, y) => [722 + (x - 65) * .51, 335 + (y - 710) * .51];
     const P3 = (x, y) => [655 + (x - 495) * .71, 422 + (y - 70) * .72];
     ```
   - These functions map coordinate offsets from 3 different screenshot crops into a virtual Three.js world coordinate system.
   - **Problem:** Features lack real-world WGS84 latitude/longitude coordinates (EPSG:4326). It is impossible to overlay real satellite imagery, ingest GPS locations, or import OpenStreetMap/GeoJSON layers accurately.
2. **Absence of Metric Ground Scale:**
   - Scale factor `/ 8` is an empirical visual approximation. Real distances between buildings cannot be calculated or verified.
3. **Absence of Accuracy Confidence Tags:**
   - The original app labels all 25 features identically. Highly accurate buildings (e.g. CSE Complex, Main Gate) are indistinguishable from approximate infill models.

### 2.3 3D Graphics, Performance & WebGL (High / Medium)
1. **Excessive Draw Calls:**
   - Over 50 individual building meshes, dozens of road segments, and hundreds of residential boxes are created as separate meshes with distinct material instances (`fm()` clones textures on every call).
2. **CPU-Bound Particle Animation:**
   - Rain animation iterates over 1,400 line segments every frame on the CPU (`rainG.attributes.position.needsUpdate = true`), causing frame drops on low-end or mobile GPUs.
3. **Memory Leaks on Texture Generation:**
   - Dynamic canvas textures (`tc`, `ec`, `gc`, `cv2`) are generated and never disposed. Cloned materials inside `fm` are retained in memory indefinitely.
4. **Lack of WebGL Context Management:**
   - No listeners for `webglcontextlost` or `webglcontextrestored`. If a mobile device switches apps or background tabs, the canvas freezes or crashes.

### 2.4 Navigation & First-Person Exploration (High)
1. **"Walk Mode" is merely a Lowered Orbit Target:**
   - The existing walk button (`bw`) sets `ctl.minDistance = 2` and targets height 2.6m. It does not provide true WASD keyboard walking, mouse look, or collision prevention.
2. **Zero Collision Detection:**
   - The camera can pass through buildings, trees, and ground surfaces.
3. **No Pedestrian Pathfinding:**
   - Navigation between points of interest does not exist. Clicking a building only moves the orbit camera; no walking path or directional guidance is calculated.

### 2.5 User Interface, Accessibility & Mobile UX (High / Medium)
1. **Cluttered Mobile Screen:**
   - Floating buttons in `#bar` wrap haphazardly and cover over 35% of a mobile viewport.
2. **Accessibility (WCAG) Deficiencies:**
   - Pin labels lack keyboard focusability (`tabindex`), screen-reader descriptions, and ARIA roles.
   - Missing high-contrast focus rings and reduced-motion media query handling.
3. **Brittle Tour Controls:**
   - Any global pointer down event (`addEventListener('pointerdown', () => stopTour())`) aborts the tour, making it impossible to click anywhere without breaking the tour.

---

## 3. Rectification & Modernization Strategy

```
+-----------------------------------------------------------------------------------+
|                           SAHE3D Modernized Architecture                          |
+-----------------------------------------------------------------------------------+
|  [ Presentation / UI Layer ]                                                      |
|   - Glassmorphic Interface (Tailwind CSS / Custom CSS)                            |
|   - Campus Directory, Building Details, Safe Search, Floating Toolbar             |
|   - Turn-by-Turn Navigation HUD, Time/Weather Modal, Tour Controller              |
+-----------------------------------------------------------------------------------+
|  [ Geospatial & Navigation Engine ]                                               |
|   - WGS84 Geographic Coordinate System (EPSG:4326 <-> Local Metric Tangent Plane) |
|   - GeoJSON Datasets: campus boundary, buildings, POIs, roads, pedestrian graph   |
|   - Dijkstra / A* Routing Engine with Distance (m) & Walking Time (min)           |
+-----------------------------------------------------------------------------------+
|  [ 3D WebGL Digital Twin Engine (Three.js Modern Modular) ]                       |
|   - Procedural Architectural Generator (Facades, Window Grids, Parapets, Tanks)  |
|   - Real-World Landmark Replicas (SAHE Entrance Arch, Saraswathi Statue, etc.)    |
|   - Landscaping, High-Performance Instanced Foliage & Streetlamps                 |
|   - True First-Person Controller (WASD + Mouse Look + AABB Collision Engine)      |
|   - Dynamic Sun/Sky Lighting, Realistic Atmospheric Fog, Weather & Season Engine  |
|   - Instanced Animated Vehicles, Pedestrians & Birds with Dedicated Toggles       |
+-----------------------------------------------------------------------------------+
|  [ Core Infrastructure & Security ]                                               |
|   - TypeScript + Vite Modular Architecture                                        |
|   - Strict DOM Sanitization (Zero innerHTML injection)                            |
|   - Versioned Safe LocalStorage with Corrupt Storage Recovery                     |
|   - WebGL Context Loss Recovery & Graceful Fallback                               |
|   - Comprehensive Automated Test Suite (Unit, Integration, Browser E2E)           |
+-----------------------------------------------------------------------------------+
```

---

## 4. Feature Preservation Guarantee

All original features authored by **Dr. Veeramallu Satya Sahithi** will be **preserved, enhanced, and credited**:
- SAHE Kanuru Campus procedural visualization.
- SAHE Maroon Entrance Arch with 3D typography.
- Time-of-day simulation with live clock and manual slider.
- Clear, Cloudy, Fog, and Rain weather simulations.
- Summer, Monsoon, Autumn, and Winter season color palette transformations.
- Animated traffic, pedestrians, and flying birds with toggle.
- Saraswathi Statue & KachhaPi garden circle landmark.
- Cinematic camera tour and campus landmark fly-to.
- Search with category chips.
- Renaming capability with versioned, XSS-safe local storage.

---

## 5. Implementation Roadmap

1. **Phase 1:** Complete Codebase Audit & Documentation *(Current)*
2. **Phase 2:** Project Tooling Modernization (Vite, TypeScript, Lucide Icons, Modern Three.js)
3. **Phase 3:** GIS Foundation & GeoJSON Datasets (WGS84 Lat/Lon, Metric Projector, Campus Boundary)
4. **Phase 4:** Architectural 3D Digital Twin & Instanced Scene Upgrades
5. **Phase 5:** First-Person Walking Mode with AABB Collision Prevention
6. **Phase 6:** Pedestrian Navigation with A* Graph Routing & Tour Controller
7. **Phase 7:** Glassmorphic UI/UX Redesign & Accessibility Optimization
8. **Phase 8:** Rigorous Testing, Git Commit, Push to `SAHE3DbySahithiV` & Vercel Production Release
