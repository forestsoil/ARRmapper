# ARR Project Suite

A collection of offline-capable progressive web apps (PWAs) for field data collection, monitoring, and management on Afforestation, Reforestation and Revegetation (ARR) carbon projects in India, verified under Verra VCS VM0047.

**Suite launcher:** https://forestsoil.github.io/ARRmapper/

---

## Applets

### 🗺️ ARR Mapper
Field mapping tool with five integrated tabs: Plantation Mapper (species block drawing, sapling grid generation), Soil Mapper (soil classification blocks), Vector Tool (GPS walk polygons, manual polygons, POI markers, track lines with stage/revision tracking), MRV Tool (stratified random sampling, per-point grading, composite score 0–100, quarterly photo capture), and Files (OPFS cache management, legacy plot sync). Single-file offline-first PWA.

### 📋 Survey Manager
Structured offline field data collection. Forms: Beneficiary Baseline Survey, Plantation Details, Fencing Details, Event/Meeting Record, Biomass Plot Details, Biomass Tree Assessment, Nursery Mapping, Plantation Plot Evaluation (mortality), Leakage Assessment, Grievance Registration/Resolution. OPFS for blobs, IndexedDB for queue. Drive folder: `appSurveyManager/{username}/`.

### 🔥 Hotspot Viewer
COG-based land suitability viewer. 3-band RGB composite: drought stress, soil suitability, flood frequency. Village boundary GeoJSONs with District/Block cascade dropdowns. Read-only; no auth required.

### 📊 Plantation Dashboard
Interactive overview of plantation plots from `asha_plantation.geojson` (511 features, 2024–2026). District/Block/LPC filter cascades on a full-screen Leaflet map with 30% sidebar. Fully open — no login required.

### 📈 Monitoring Dashboard
MRV composite scoring dashboard linked to field visit records. Six plot-level metrics (42%) plus tree condition observations (58%) = 0–100 score mapped to A+/D letter grades. Driven by the shared GAS backend.

### 🦋 CCB & SDG Dashboard
Biodiversity sightings map, Cloud Vision API species identification, EXIF GPS extraction, BibTeX bibliography with Drive sync, Know Your Invasives modal. Photo URLs via Google Drive (`lh3.googleusercontent.com/d/`).

### 📦 Inventory
Materials management for fencing, plantation, and nursery stock across all four projects and districts. SHA-256 email-hash manifest auth (hash-only manifest in repo). GAS backend for stock ledger sync.

### 🌿 Nursery Dashboard
Sapling dispatch tracking, seed tree provenance, and nursery inspections across four districts (APDE, APDW, JPG, CBH) and six nursery sources. 560+ legacy dispatch rows with deterministic SHA-256 UUIDs. IndexedDB local cache with JSONP Pull from Sheet sync.

### 📄 Document & Report
Documentation and report generation for project records.

---

## Architecture

- **Single-file HTML/JS** — no build step, no framework; each applet is self-contained
- **Offline-first**: OPFS (file blobs), IndexedDB (queues, local cache), localStorage (auth tokens, theme)
- **Suite launcher** (`index.html`) with Google One Tap / Google Sign-In; auth state shared across all applets via localStorage keys (`arr_user_email`, `arr_user_name`, `arr_auth_ts`; 12-hour TTL)
- **Auth postures**: full-block (ARRmapper, SurveyManager, Hotspot, Inventory), write-gated (CCBSDGDashboard, MonitoringDashboard, NurseryDashboard, Documentation), open (Plantation Dashboard)
- **Backend**: Google Apps Script (JSONP for GETs, no-cors POST for uploads), Google Sheets, Google Drive
- **Maps**: Leaflet; **Charts**: Chart.js; **EXIF**: exifr / piexifjs; **Shapefiles**: shpjs + proj4js; **COGs**: GeoTIFF.js
- **Theme**: dark (forest `#1a3d2b` / mint text `#d8f3dc`) and light (mint bg `#e8f3e9` / forest text); shared `arr-shared.css`, `arr_theme` localStorage key
- **SW cache** auto-bumped on every push via GitHub Actions (`bump-sw-cache.yml`)
- Trilingual UI: English / বাংলা / हिंदी; Android-optimised for 2G field conditions

---

## Projects

| Key | Label | Districts | Start |
|-----|-------|-----------|-------|
| Asha 1 | Asha 1 (VCS 4866) | Jalpaiguri, Alipurduar, Coochbehar — West Bengal | 2023 |
| Asha 2 | Asha 2 | Jalpaiguri, Alipurduar, Coochbehar — West Bengal | 2027 |
| Arun | Arun | Namsai, Changlang, Lohit, Lower Dibang Valley, East Siang — Arunachal Pradesh | 2027 |
| Banani | Banani | Birbhum, Bankura, Purulia, Jhargram, Paschim Bardhaman — West Bengal + Jharkhand/Bihar border | 2027 |

Carbon developer partner: EcoAct / Schneider Electric France.

---

## GAS Endpoints

| Purpose | Deployment ID |
|---------|--------------|
| ARRmapper / CCBSDGDashboard | `AKfycbwLfbyg-C2CgYi7cfxjBZrGaYrKkuD2I1SQXIBecqyfWVdtJkWQVG9Sb1F7s45i1u5R` |
| Inventory | `AKfycbyv1LAvEJ4Kho32m6ToPAAjUSeeEvdYJQTUVQW182fHzO3Peok-rxVXxT8Vi2Ltw5Rs0w` |

All endpoints: `https://script.google.com/macros/s/<ID>/exec`

---

## Development

- Versioned filenames (e.g. `appARRmapper_v82.html`); archive only meaningful milestones
- Patch surgically by tab/section; avoid broad structural refactors
- Major UI experiments in separate dev files, not on production
- JSONP (not fetch) for all GAS GET requests
- `yyyy-mm-dd` canonical date format throughout
- SHA-256 deterministic UUIDs for offline-generated record IDs
- GEE used for pre-processing / offline export only — no runtime GEE API calls in any frontend
- Browser OAuth Client ID is for Drive / Picker only

---

## License

Internal use — Tomorrow's Foundation / EcoAct ARR carbon projects, India.  
© 2025–2026 Nirmalya Chatterjee. All rights reserved.
