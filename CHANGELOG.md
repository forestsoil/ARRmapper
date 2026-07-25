# CHANGELOG — arrm-cog

## [2.0.0] — 2026-07-25

### Added
- `/villages/` — simplified village boundary GeoJSONs (10 districts, WB) for GPS point-in-polygon lookup in `appSurveyManager` and `appHotspot`
  - Simplified at 10% weighted (mapshaper), ~10–15m equivalent resolution
  - Properties: `District`, `Dist_LGD`, `Sub_dist`, `Subdis_LGD`, `Vill_name`, `Vill_Cat`, `Vill_LGD`, `arr_project`
  - Districts: Alipurduar, Darjeeling, Jalpaiguri, Kalimpong, Cooch Behar (Asha1/2); Bankura, Birbhum, Jhargram, Paschim Bardhaman, Purulia (Banani)
- `/villages_soi/` — original full-resolution SOI village boundaries preserved as master copies (~65MB total, not fetched by apps)
- `simplify_villages.py` — mapshaper-based simplification pipeline; reads from `villages_soi/`, writes to `villages/`
- COG layers expanded to include soil suitability (`*_soil_suit.tif`) for all 4 projects (Asha1, Asha2, Arun, Banani)
- `README.md` updated with full repo structure, file inventory, URL patterns, and update cadence

### Changed
- COGs moved into `/cogs/` subfolder (previously at repo root)
- COG filenames standardised: `*_stress_score.tif` → `*_drought_stress.tif`
- Repo history squashed to single clean commit (orphan branch reset) to reduce `.git` size

### Notes
- Arunachal Pradesh village boundaries not included — SOI data restricted under Inner Line Permit (ILP) regulations; in-app GPS fallback uses Nominatim reverse geocoding
- Jharkhand / Bihar district boundaries (Banani project border areas) not yet available; manual entry used in-app

---

## [1.0.0] — 2026 (initial)

### Added
- Pre-computed COGs for Asha1, Asha2, Arun, Banani projects
  - Flood frequency (NDWI-derived, Landsat 8/9, 30m)
  - Drought / barrenness stress (BSI-derived)
- `appHotspot.html` — land suitability hotspotter using HTTP range requests on COGs
- GitHub Pages enabled for COG serving
- Source pipeline: Google Earth Engine → `geemap` + `geedim` → `rio-cogeo`
