# arrm-cog

Data hosting repo for the **ARRmapper suite** — serving Cloud-Optimised GeoTIFFs (COGs) and simplified village boundary GeoJSONs via GitHub Pages.

---

## Contents

### `/cogs` — Pre-computed Cloud-Optimised GeoTIFFs

Raster layers for land suitability hotspotting in `appHotspot.html`.

| File | Project | Layer | Period |
|---|---|---|---|
| `asha1_flood_freq.tif` | Asha 1 (Alipurduar, Jalpaiguri, Coochbehar) | Flood frequency (NDWI) | 2013–present |
| `asha1_drought_stress.tif` | Asha 1 | Drought / barrenness stress (BSI) | 2013–present |
| `asha1_soil_suit.tif` | Asha 1 | Soil suitability | 2013–present |
| `asha2_flood_freq.tif` | Asha 2 Tea (Darjeeling, Kalimpong + Asha1 districts) | Flood frequency (NDWI) | 2013–present |
| `asha2_drought_stress.tif` | Asha 2 Tea | Drought / barrenness stress (BSI) | 2013–present |
| `asha2_soil_suit.tif` | Asha 2 Tea | Soil suitability | 2013–present |
| `arun_flood_freq.tif` | Arun (Namsai, Changlang, Lohit, Lower Dibang Valley, East Siang) | Flood frequency (NDWI) | 2015–present |
| `arun_drought_stress.tif` | Arun | Drought / barrenness stress (BSI) | 2015–present |
| `arun_soil_suit.tif` | Arun | Soil suitability | 2015–present |
| `banani_flood_freq.tif` | Banani (Birbhum, Bankura, Purulia, Jhargram, Paschim Bardhaman) | Flood frequency (NDWI) | 2015–present |
| `banani_drought_stress.tif` | Banani | Drought / barrenness stress (BSI) | 2015–present |
| `banani_soil_suit.tif` | Banani | Soil suitability | 2015–present |

**Resolution:** 30m (Landsat 8/9)  
**CRS:** EPSG:4326  
**Source:** Google Earth Engine via `geemap` + `geedim`; converted to COG with `rio-cogeo`  
**HTTP range requests:** COG tile structure allows clients to fetch only the window covering a plot — not the full raster

Accessible at:
```
https://forestsoil.github.io/arrm-cog/cogs/{filename}
```

---

### `/villages` — Simplified Village Boundary GeoJSONs

Point-in-polygon GPS lookup for `appSurveyManager` and `appHotspot`. One file per district, covering ARR project areas in West Bengal.

| File | District | Project(s) | Approx. size |
|---|---|---|---|
| `alipurduar_villages.geojson` | Alipurduar | Asha1, Asha2 | ~0.2 MB |
| `darjiling_villages.geojson` | Darjeeling | Asha1, Asha2 | ~0.3 MB |
| `jalpaiguri_villages.geojson` | Jalpaiguri | Asha1, Asha2 | ~0.3 MB |
| `kalimpong_villages.geojson` | Kalimpong | Asha1, Asha2 | ~0.1 MB |
| `koch_bihar_villages.geojson` | Cooch Behar | Asha1, Asha2 | ~0.7 MB |
| `bankura_villages.geojson` | Bankura | Banani | ~1.5 MB |
| `birbhum_villages.geojson` | Birbhum | Banani | ~1.2 MB |
| `jhargram_villages.geojson` | Jhargram | Banani | ~0.6 MB |
| `paschim_bardhaman_villages.geojson` | Paschim Bardhaman | Banani | ~0.2 MB |
| `puruliya_villages.geojson` | Purulia | Banani | ~1.0 MB |

**Properties per feature:** `District`, `Dist_LGD`, `Sub_dist` (Block), `Subdis_LGD`, `Subdis_Typ`, `Vill_name`, `Vill_Cat`, `Vill_LGD`, `arr_project`  
**Simplification:** 10% weighted (mapshaper), `keep-shapes`, `snap` — ~10–15m equivalent resolution, safe for GPS point-in-polygon  
**CRS:** EPSG:4326  
**Source:** Survey of India / LGD via QGIS pipeline  
**Note:** Arunachal Pradesh (Arun project) not included — SOI data restricted under ILP; Nominatim fallback used in-app

Accessible at:
```
https://raw.githubusercontent.com/forestsoil/arrm-cog/main/villages/{district}_villages.geojson
```

GPS lookup uses `Vill_name` as GP proxy and `Sub_dist` for block auto-selection. Actual village name is free-text / Nominatim suggestion in-app.

---

### `/villages_soi` — Original SOI Village Boundaries (master)

Full-resolution originals (~65MB total). Not fetched by apps. Preserved for future high-precision use or re-simplification.

---

### `simplify_villages.py`

Simplification script. Run from repo root after updating `/villages_soi`:

```bash
npm install -g mapshaper   # one-time
python3 simplify_villages.py
git add villages/
git commit -m "update simplified villages"
git push
```

---

### `appHotspot.html`

Land suitability hotspotter app. Reads COGs via HTTP range requests, overlays on Leaflet map, filters by project and suitability layer.

---

## Update cadence

**COGs:** Re-run `arr_cog_export_v2.py` annually (or post wet-season) and commit replacements. Script end-date auto-sets to run date.  
**Villages:** Re-simplify from `/villages_soi` if source boundaries are updated.

---

## Related

- [forestsoil/ARRmapper](https://github.com/forestsoil/ARRmapper) — main field tool suite (ARRmapper, appSurveyManager, appDashboard)
- **Projects:** Asha1 (North Bengal ARR, 2023), Asha2 Tea (2027), Arun (Arunachal Pradesh ARR, 2025), Banani (Malbhum ARR, 2025)
- **Carbon methodology:** Verra VCS VM0047 ARR
- **Implementing org:** Tomorrows Foundation (TF) / TSLPL; Carbon developer: EcoAct / Schneider Electric France
