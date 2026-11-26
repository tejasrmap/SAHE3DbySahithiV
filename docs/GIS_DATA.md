# SAHE3D Geospatial Datasets & Coordinate System Reference

## 1. Geographic Datasets

All campus spatial features are organized into standard JSON and GeoJSON datasets in `src/data/`:

| Dataset | Format | Feature Count | Purpose |
| :--- | :--- | :---: | :--- |
| `campus-boundary.json` | GeoJSON Polygon | 1 | 28.5-hectare campus perimeter polygon |
| `buildings.json` | JSON Array | 11 | Multi-floor academic buildings with dimensions & facilities |
| `pois.json` | JSON Array | 10 | Statues, sports grounds, gates, banks, EV charging |
| `campus-roads.json` | JSON Array | 5 | Road geometries (NH65, Entrance Avenue, Promenade) |
| `pedestrian-graph.json`| Graph JSON | 14 nodes, 15 edges | Walkway network for turn-by-turn routing |
| `campus.geojson` | GeoJSON FeatureCollection | 5 | OGC-standard GIS interchange format |

## 2. Accuracy Classification Standard

Every campus entity is classified with one of five standardized accuracy levels:
- **`VERIFIED`**: Exact footprint and coordinates confirmed against satellite imagery and official institutional data.
- **`SOURCE-BASED`**: Derived from OpenStreetMap and institutional records.
- **`APPROXIMATE`**: General spatial positioning known within 10–20 meters.
- **`PROCEDURAL`**: Procedurally generated visual context (e.g. surrounding residential houses).
- **`UNVERIFIED`**: Requires on-site GPS survey.
