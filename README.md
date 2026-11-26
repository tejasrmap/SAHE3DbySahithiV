# SAHE3D — Modernized 3D Digital Twin & Geospatial Campus Explorer

> **Siddhartha Academy of Higher Education (SAHE), Kanuru, Vijayawada, Andhra Pradesh, India**  
> **Geographic Coordinates:** `16.4842° N, 80.6928° E` | **Elevation:** `19.0 m`  
> **Original Prototype Author:** Dr Veeramallu Satya Sahithi  
> **Modernized Production Release:** v2.0.0

---

## Overview

**SAHE3D Campus Explorer** is an interactive, production-grade 3D digital twin and WebGL GIS platform designed for students, faculty, visitors, and campus planners. It models the sprawling academic complex of Siddhartha Academy of Higher Education (VR Siddhartha Engineering College campus at Kanuru) with high geospatial accuracy, procedural multi-storey architecture, dynamic astronomical lighting, realistic weather simulations, turn-by-turn pedestrian routing, and a first-person walking exploration mode.

---

## Key Features

1. **Geographic GIS Foundation:**
   - Calibrated WGS84 local tangent plane projection mapping real-world GPS coordinates to Three.js metric scene coordinates.
   - Verified campus boundary perimeter with glowing emerald boundary line.
   - GeoJSON compliance (`src/data/campus.geojson`).

2. **Procedural Architectural Realism:**
   - Multi-storey building facades with detailed window mullions, chajja sunshades, and rooftop parapet walls.
   - Architectural landmark replicas:
     - Siddhartha Academy Maroon Entrance Gate on NH65 Bandar Road with 3D typography.
     - Saraswathi Statue & KachhaPi garden rotunda and fountain.
     - Swami Vivekananda commemorative statue plaza.
     - Athletic complex with 400m running track, turf cricket oval, and acrylic synthetic basketball court.
   - Rooftop solar arrays, elevator machine rooms, and industrial water storage tanks.

3. **Immersive First-Person Walking Mode:**
   - Real human eye-level camera height (~1.75m).
   - Fluid `WASD` / `Arrow Keys` movement with sprint acceleration (`Shift`).
   - Mouse look / touch look orientation.
   - Continuous 2D AABB collision detection against campus buildings and perimeter fences.

4. **Pedestrian Routing & Navigation:**
   - A* / Dijkstra shortest-path pathfinding on an internal pedestrian walkway graph.
   - Computes real-world walking distance in meters and walking time in minutes.
   - 3D cyan neon dashed route line overlaid directly onto the campus terrain.

5. **Cinematic Campus Tour:**
   - 8 curated, verified campus stops featuring smooth Catmull-Rom spline orbital camera transitions.
   - Interactive Tour HUD with stop counter, landmark descriptions, pause/play, next/previous, and instant exit.

6. **Astronomical Lighting, Weather & Seasons:**
   - Vijayawada-calibrated sun trajectory (sunrise at 05:45, sunset at 18:15).
   - Dynamic sky color lerping, atmospheric fog, and emissive night window illumination.
   - Clear, Cloudy (procedural 3D cumulus clouds), Fog, and Particle Rain weather effects.
   - Summer, Monsoon, Autumn, and Winter dynamic foliage and terrain adaptation.

7. **Animated Traffic, Pedestrians & Birds:**
   - Highway vehicles along NH65, walking pedestrians on internal promenades, and circling birds with wing animation.
   - Dedicated toolbar toggle to enable/disable for low-power devices.

8. **Glassmorphic Accessible UI:**
   - Global real-time search across buildings, labs, departments, and services.
   - Category filter chips (Academic, Library, Hostels, Dining, Sports, Services, Landmarks).
   - Collapsible campus directory sidebar.
   - Place inspection modal with coordinates, floor counts, height, and facilities chips.
   - Safe custom place renaming with input sanitization and XSS protection.

---

## Technology Stack

- **Core Engine:** Modern Three.js (r160) + WebGL PCFSoftShadows
- **Language & Build Tool:** TypeScript 5.3 + Vite 5.1
- **Styling:** CSS3 Glassmorphism with responsive layout and safe area insets
- **Geospatial & Graph:** WGS84 EPSG:4326 Local Tangent Plane Projection + Dijkstra Pedestrian Routing
- **Deployment:** Vercel Production Platform

---

## Installation & Development

```bash
# Clone the repository
git clone https://github.com/tejasrmap/SAHE3DbySahithiV.git
cd SAHE3DbySahithiV

# Install dependencies
npm install

# Start local development server
npm run dev

# Run automated unit and browser test suite
npm test

# Build production distribution
npm run build
```

---

## Credits & Attribution

- **Original Concept & Prototype:** Dr Veeramallu Satya Sahithi
- **Modernization & Production Engineering:** Senior Full-Stack & GIS Geospatial Engineering
