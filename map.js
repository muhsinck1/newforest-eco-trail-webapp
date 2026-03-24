// NEW FOREST ECOLOGICAL ATLAS — map.js (UI Redesign)

// ── CONFIG ───────────────────────────────────────────────────

const MAP_CONFIG = {
  center:   [-1.595, 50.862],
  zoom:     12,
  pitch:    55,
  bearing:  15,
  maxPitch: 85,
  minZoom:  8
};
const TERRAIN_EXAGGERATION = 2.2;

// ── DATA PATHS ───────────────────────────────────────────────

const DATA = {
  boundary:   'data/boundary.geojson',
  phi:        'data/phinewforest.geojson',
  ecohabitat: 'data/ecotrailhabitat.geojson',
  burley:     'data/burleyvillagetrails.geojson',
  emery:      'data/emerydowncircle.geojson',
  reihan:     'data/reihanfiled.geojson',
  birds:      'data/birds.geojson',
  fungi:      'data/fungi.geojson',
  plants:     'data/plants.geojson'
};

// ── COLOURS ──────────────────────────────────────────────────

const C = {
  boundary: '#ffffff',
  burley:   '#ff8c42',
  emery:    '#ff4d4d',
  reihan:   '#f59e0b',
  phi:      '#6dbe3c',
  heathland:'#e8c84a',
  woodland: '#4cde8f',
  bog:      '#38bdf8',
  birds:    '#4cde8f',
  fungi:    '#c084fc',
  plants:   '#22d3ee',
  fallback: '#6dbe3c'
};

const BIO_COLOURS = { birds: '#4cde8f', fungi: '#c084fc', plants: '#22d3ee' };

const EXPOSURE = { low: '#f5d142', medium: '#f5821e', high: '#e03131' };

// ── SVG ICONS for biodiversity points ───────────────────────
// Encoded as data URIs — no external requests needed

const ICONS = {
  birds: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <circle cx="12" cy="12" r="11" fill="#0a1a0e" stroke="#4cde8f" stroke-width="1.5"/>
    <path d="M7 13 C7 10 9 8 12 8 C15 8 17 9.5 18 11 L15 11 C14 9.5 12.5 9 11 10 L13 12 L8 14 Z" fill="#4cde8f"/>
    <circle cx="15.5" cy="9.5" r="1" fill="#4cde8f"/>
    <path d="M7 13 L5 14 L7 14 Z" fill="#4cde8f"/>
  </svg>`,

  fungi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <circle cx="12" cy="12" r="11" fill="#0a1a0e" stroke="#c084fc" stroke-width="1.5"/>
    <path d="M8 13 C8 9 9.5 7 12 7 C14.5 7 16 9 16 13 Z" fill="#c084fc"/>
    <rect x="11" y="13" width="2" height="5" rx="1" fill="#c084fc" opacity="0.8"/>
    <path d="M9 13 L8 15 M12 13 L12 15 M15 13 L16 15" stroke="#0a1a0e" stroke-width="0.8"/>
  </svg>`,

  plants: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <circle cx="12" cy="12" r="11" fill="#0a1a0e" stroke="#22d3ee" stroke-width="1.5"/>
    <path d="M12 17 L12 10" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 13 C12 13 9 12 8 9 C10 9 12 11 12 13 Z" fill="#22d3ee"/>
    <path d="M12 11 C12 11 15 10 16 7 C14 7.5 12 9.5 12 11 Z" fill="#22d3ee" opacity="0.8"/>
  </svg>`
};

// Convert SVG string to data URI for MapLibre image
function svgToDataURI(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── BASE STYLE ───────────────────────────────────────────────

function buildBaseStyle() {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256, maxzoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0a1a0e' } },
      {
        id: 'osm-tiles', type: 'raster', source: 'osm',
        paint: {
          'raster-opacity':        0.70,
          'raster-saturation':    -0.50,
          'raster-contrast':       0.05,
          'raster-brightness-min': 0.04,
          'raster-brightness-max': 0.76
        }
      }
    ]
  };
}

// ── INIT MAP ─────────────────────────────────────────────────

const map = new maplibregl.Map({
  container: 'map', style: buildBaseStyle(),
  center: MAP_CONFIG.center, zoom: MAP_CONFIG.zoom,
  pitch: MAP_CONFIG.pitch, bearing: MAP_CONFIG.bearing,
  maxPitch: MAP_CONFIG.maxPitch, minZoom: MAP_CONFIG.minZoom,
  antialias: true,
  maxBounds: [[-2.5, 50.4], [-0.8, 51.3]],
  renderWorldCopies: false
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
map.addControl(new maplibregl.FullscreenControl(), 'top-right');

// ── GEOJSON LOADER ───────────────────────────────────────────

async function loadAndAdd(key, path, addFn) {
  try {
    const t0  = performance.now();
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const n = (data.features || []).length;
    console.log(`[${key}] ✓ ${n} features in ${Math.round(performance.now()-t0)}ms`);
    if (n > 0) addFn(data);
    else console.warn(`[${key}] ⚠ 0 features`);
    return data;
  } catch (err) {
    console.error(`[${key}] ✗ ${err.message}`);
    const row = document.querySelector(`[data-id="${key}"]`);
    if (row) { row.classList.add('error'); row.title = `Failed: ${path}`; }
    return null;
  }
}

// ── MAP LOAD ─────────────────────────────────────────────────

map.on('load', () => {
  document.getElementById('loading').classList.add('hidden');
  const pb = document.getElementById('progress-bar');
  pb.classList.add('active');

  // Load bio icons as MapLibre images
  loadBioImages();

  let done = 0;
  const total = Object.keys(DATA).length;

  function tick() {
    done++;
    document.getElementById('progress-fill').style.width = Math.round((done/total)*100) + '%';
    document.getElementById('progress-label').textContent = `Loading layers… ${done}/${total}`;
    if (done === total) {
      setTimeout(() => pb.classList.remove('active'), 800);
      tryAddTerrain();
      maybeHotspot();
    }
  }

  loadAndAdd('boundary',   DATA.boundary,   d => { addBoundaryLayer('boundary', d);           tick(); });
  loadAndAdd('phi',        DATA.phi,        d => { addPhiLayer('phi', d); attachHabitatEvents('phi'); tick(); });
  loadAndAdd('ecohabitat', DATA.ecohabitat, d => { addEcoHabitatLayer('ecohabitat', d); attachHabitatEvents('ecohabitat'); tick(); });
  loadAndAdd('burley',     DATA.burley,     d => { addTrailLayer('burley', d, C.burley); attachTrailEvents('burley'); attachTrailExplorer('burley'); tick(); });
  loadAndAdd('emery',      DATA.emery,      d => { addTrailLayer('emery',  d, C.emery);  attachTrailEvents('emery');  attachTrailExplorer('emery');  tick(); });
  loadAndAdd('reihan',     DATA.reihan,     d => { addTrailLayer('reihan', d, C.reihan); attachTrailEvents('reihan'); attachTrailExplorer('reihan'); tick(); });
  loadAndAdd('birds',      DATA.birds,      d => { addPointLayer('birds',  d, 'bird-icon');  attachPointEvents('birds');
    storeBioData('birds', d); document.getElementById('stat-birds').textContent = d.features.length; maybeHotspot(); tick(); });
  loadAndAdd('fungi',      DATA.fungi,      d => { addPointLayer('fungi',  d, 'fungi-icon'); attachPointEvents('fungi');
    storeBioData('fungi', d); document.getElementById('stat-fungi').textContent = d.features.length; maybeHotspot(); tick(); });
  loadAndAdd('plants',     DATA.plants,     d => { addPointLayer('plants', d, 'plant-icon'); attachPointEvents('plants');
    storeBioData('plants', d); document.getElementById('stat-plants').textContent = d.features.length; maybeHotspot(); tick(); });
});

// ── LOAD BIO ICONS ───────────────────────────────────────────

function loadBioImages() {
  const defs = [
    { id: 'bird-icon',  svg: ICONS.birds  },
    { id: 'fungi-icon', svg: ICONS.fungi  },
    { id: 'plant-icon', svg: ICONS.plants }
  ];
  defs.forEach(({ id, svg }) => {
    const img = new Image(24, 24);
    img.onload = () => { if (!map.hasImage(id)) map.addImage(id, img, { sdf: false }); };
    img.src = svgToDataURI(svg);
  });
}

// ── OPTIONAL TERRAIN ─────────────────────────────────────────

function tryAddTerrain() {
  try {
    if (map.getSource('dem')) return;
    map.addSource('dem', { type: 'raster-dem', url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json', tileSize: 256, maxzoom: 11 });
    map.addLayer({ id: 'hillshade-layer', type: 'hillshade', source: 'dem',
      paint: { 'hillshade-shadow-color': '#060e07', 'hillshade-highlight-color': '#c8deb4', 'hillshade-exaggeration': 0.38, 'hillshade-illumination-direction': 315 }
    }, 'osm-tiles');
    map.setTerrain({ source: 'dem', exaggeration: TERRAIN_EXAGGERATION });
    map.setFog({ color: '#0a1a0e', 'high-color': '#162a1a', 'horizon-blend': 0.04, 'space-color': '#0a1a0e', 'star-intensity': 0 });
    console.log('[terrain] ✓ 3D enabled');
    document.getElementById('btn-3d').classList.add('active');
  } catch(e) { console.warn('[terrain] 2D mode:', e.message); }
}

// ── LAYER: Boundary ──────────────────────────────────────────

function addBoundaryLayer(id, data) {
  map.addSource(id, { type: 'geojson', data });
  map.addLayer({ id: id+'-fill', type: 'fill', source: id, paint: { 'fill-color': '#fff', 'fill-opacity': 0.02 } });
  map.addLayer({ id: id+'-line', type: 'line', source: id,
    paint: { 'line-color': '#fff', 'line-width': 1.8, 'line-opacity': 0.45, 'line-dasharray': [5,4] } });
}

// ── LAYER: PHI ───────────────────────────────────────────────

function addPhiLayer(id, data) {
  map.addSource(id, { type: 'geojson', data, generateId: true });
  map.addLayer({ id: id+'-fill', type: 'fill', source: id,
    paint: { 'fill-color': C.phi, 'fill-opacity': ['case', ['boolean', ['feature-state','hover'],false], 0.45, 0.28] } });
  map.addLayer({ id: id+'-line', type: 'line', source: id,
    paint: { 'line-color': C.phi, 'line-width': ['case', ['boolean', ['feature-state','hover'],false], 5, 3.5], 'line-opacity': 0.95 } });
  map.addLayer({ id: id+'-glow', type: 'line', source: id,
    paint: { 'line-color': C.phi, 'line-width': 10, 'line-opacity': 0.15, 'line-blur': 8 } });
}

// ── LAYER: Eco Habitat (3-tier exposure) ─────────────────────

function addEcoHabitatLayer(id, data) {
  map.addSource(id, { type: 'geojson', data, generateId: true });
  const colourExpr = [
    'case',
    ['==', ['get','exposure'], 'low'],    EXPOSURE.low,
    ['==', ['get','exposure'], 'medium'], EXPOSURE.medium,
    ['==', ['get','exposure'], 'high'],   EXPOSURE.high,
    ['==', ['get','habitat_type'], 'Lowland Heathland'],            EXPOSURE.high,
    ['==', ['get','habitat_type'], 'Ancient & Ornamental Woodland'], EXPOSURE.medium,
    ['==', ['get','habitat_type'], 'Bog & Mire'],                   EXPOSURE.high,
    ['==', ['get','habitat_type'], 'Heathland'],                    EXPOSURE.high,
    ['==', ['get','habitat_type'], 'Woodland'],                     EXPOSURE.medium,
    ['==', ['get','habitat_type'], 'Bog'],                          EXPOSURE.high,
    ['==', ['get','habitat_type'], 'Grassland'],                    EXPOSURE.low,
    '#aaaaaa'
  ];
  map.addLayer({ id: id+'-fill', type: 'fill', source: id,
    paint: { 'fill-color': colourExpr, 'fill-opacity': ['case', ['boolean', ['feature-state','hover'],false], 0.55, 0.35] } });
  map.addLayer({ id: id+'-line', type: 'line', source: id,
    paint: { 'line-color': colourExpr, 'line-width': ['case', ['boolean', ['feature-state','hover'],false], 2.8, 1.8], 'line-opacity': 0.85 } });
}

// ── LAYER: Trails ────────────────────────────────────────────

function addTrailLayer(id, data, colour) {
  map.addSource(id, { type: 'geojson', data });
  map.addLayer({ id: id+'-casing', type: 'line', source: id,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#000', 'line-width': 7, 'line-opacity': 0.35 } });
  map.addLayer({ id: id+'-glow', type: 'line', source: id,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': colour, 'line-width': 9, 'line-opacity': 0, 'line-blur': 7 } });
  map.addLayer({ id: id+'-layer', type: 'line', source: id,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': colour, 'line-width': 3.5, 'line-opacity': 0.98 } });
}

// ── LAYER: Biodiversity Points (SVG icons) ───────────────────
// Uses symbol layers with custom SVG images instead of plain circles.
// Zoom-gated: icons appear at zoom >= 11, scale up as user zooms in.
// A subtle circle halo still renders at zoom >= 12 for emphasis.

function addPointLayer(id, data, iconId) {
  const colour = BIO_COLOURS[id] || '#4cde8f';
  map.addSource(id, { type: 'geojson', data, generateId: true });

  // Halo circle (subtle, zoom >= 12)
  map.addLayer({ id: id+'-halo', type: 'circle', source: id, minzoom: 12,
    paint: {
      'circle-radius':  ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 20],
      'circle-color':   colour, 'circle-opacity': 0.12
    }
  });

  // SVG icon symbol layer — shows from zoom 11 up
  map.addLayer({ id: id+'-icon', type: 'symbol', source: id, minzoom: 11,
    layout: {
      'icon-image': iconId,
      'icon-size':  ['interpolate', ['linear'], ['zoom'], 11, 0.6, 14, 0.85, 18, 1.1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });

  // Invisible hit-target circle for hover/click (always present when zoomed)
  map.addLayer({ id: id+'-point', type: 'circle', source: id, minzoom: 11,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 13], 'circle-color': 'rgba(0,0,0,0)', 'circle-opacity': 0 }
  });
}

// ── INTERACTIONS: Trails ─────────────────────────────────────

const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '300px', offset: 14 });

function attachTrailEvents(id) {
  map.on('mouseenter', id+'-layer', () => { map.getCanvas().style.cursor = 'pointer'; map.setPaintProperty(id+'-glow', 'line-opacity', 0.4); });
  map.on('mouseleave', id+'-layer', () => { map.getCanvas().style.cursor = ''; map.setPaintProperty(id+'-glow', 'line-opacity', 0); });
  map.on('click', id+'-layer', e => {
    popup.setLngLat(e.lngLat).setHTML(buildTrailPopup(id, e.features[0].properties)).addTo(map);
    map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom(), 13), speed: 0.9 });
  });
}

// ── INTERACTIONS: Habitat ────────────────────────────────────

function attachHabitatEvents(id) {
  let hovered = null;
  map.on('mousemove', id+'-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length > 0) {
      if (hovered !== null) map.setFeatureState({ source: id, id: hovered }, { hover: false });
      hovered = e.features[0].id;
      map.setFeatureState({ source: id, id: hovered }, { hover: true });
    }
  });
  map.on('mouseleave', id+'-fill', () => {
    map.getCanvas().style.cursor = '';
    if (hovered !== null) { map.setFeatureState({ source: id, id: hovered }, { hover: false }); hovered = null; }
  });
  map.on('click', id+'-fill', e => {
    popup.setLngLat(e.lngLat).setHTML(buildHabitatPopup(id, e.features[0].properties)).addTo(map);
  });
}

// ── INTERACTIONS: Bio points ──────────────────────────────────

const tooltipEl = document.getElementById('tooltip');

function attachPointEvents(id) {
  let hovered = null;
  map.on('mousemove', id+'-point', e => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length > 0) {
      if (hovered !== null) map.setFeatureState({ source: id, id: hovered }, { hover: false });
      hovered = e.features[0].id;
      map.setFeatureState({ source: id, id: hovered }, { hover: true });
      tooltipEl.textContent    = e.features[0].properties.species || e.features[0].properties.name || id;
      tooltipEl.style.opacity  = '1';
      tooltipEl.style.transform = 'translateY(0)';
    }
  });
  map.on('mouseleave', id+'-point', () => {
    map.getCanvas().style.cursor = '';
    if (hovered !== null) { map.setFeatureState({ source: id, id: hovered }, { hover: false }); hovered = null; }
    tooltipEl.style.opacity = '0'; tooltipEl.style.transform = 'translateY(4px)';
  });
  map.on('click', id+'-point', e => {
    e.stopPropagation();
    const props = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();
    popup.setLngLat(coords).setHTML(buildBioPopup(id, props)).addTo(map);
    map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 14), speed: 0.8 });
    showSidePanel(id, props);
  });
}

map.on('mousemove', e => {
  tooltipEl.style.left = (e.point.x + 14) + 'px';
  tooltipEl.style.top  = (e.point.y - 32) + 'px';
  const el = document.getElementById('coords');
  if (el) el.textContent = `${e.lngLat.lat.toFixed(5)}°N   ${Math.abs(e.lngLat.lng).toFixed(5)}°W`;
});

// ── ZOOM-AWARE UI ─────────────────────────────────────────────
// Updates zoom indicator and shows context hints as user zooms in/out

const ZOOM_DESCRIPTIONS = [
  { min: 8,  max: 10, label: 'Regional view',  hint: '🗺 Zoom in to see trail routes' },
  { min: 10, max: 12, label: 'Forest overview', hint: '🌿 Trail routes now visible' },
  { min: 12, max: 14, label: 'Trail detail',    hint: '🔍 Zooming in reveals species icons' },
  { min: 14, max: 17, label: 'Species view',    hint: '🐦 Click any icon to see observations' },
  { min: 17, max: 22, label: 'Close-up view',   hint: '🔬 Full ecological detail visible' }
];

let hintTimeout = null;
map.on('zoom', () => {
  const z = map.getZoom();
  const rounded = z.toFixed(1);
  const zv = document.getElementById('zoom-value');
  if (zv) zv.textContent = 'z' + rounded;

  const tier = ZOOM_DESCRIPTIONS.find(t => z >= t.min && z < t.max);
  if (tier) {
    const zd = document.getElementById('zoom-desc');
    if (zd) zd.textContent = tier.label;

    // Show hint briefly on zoom change
    const hint = document.getElementById('zoom-hint');
    if (hint) {
      hint.textContent = tier.hint;
      hint.classList.add('visible');
      clearTimeout(hintTimeout);
      hintTimeout = setTimeout(() => hint.classList.remove('visible'), 2200);
    }
  }
});

// ── SIDE PANEL ────────────────────────────────────────────────

function showSidePanel(type, props) {
  const colour = BIO_COLOURS[type] || '#7ec850';
  const label  = type.charAt(0).toUpperCase() + type.slice(1);
  document.getElementById('info-panel-content').innerHTML = `
    <div class="side-badge" style="color:${colour};background:${colour}22">${label}</div>
    <div class="side-species">${props.species || props.name || 'Unknown'}</div>
    ${props.latin ? `<div class="side-latin">${props.latin}</div>` : ''}
    <div class="side-grid">
      <div class="side-field"><div class="side-key">Date</div><div class="side-val">${props.date || '—'}</div></div>
      <div class="side-field"><div class="side-key">Count</div><div class="side-val">${props.count || '—'}</div></div>
      <div class="side-field" style="grid-column:1/-1"><div class="side-key">Habitat</div>
        <div class="side-val">${props.habitat || props.habitat_type || '—'}</div></div>
    </div>
    ${props.notes ? `<div class="side-notes">${props.notes}</div>` : ''}
  `;
  document.getElementById('info-panel').classList.add('open');
}

document.getElementById('info-panel-close').addEventListener('click', () => {
  document.getElementById('info-panel').classList.remove('open');
});

// ── POPUP BUILDERS ────────────────────────────────────────────

function buildBioPopup(type, props) {
  const colour = BIO_COLOURS[type] || '#7ec850';
  const label  = type.charAt(0).toUpperCase() + type.slice(1);
  return `<div class="popup-inner">
    <span class="popup-badge" style="color:${colour};background:${colour}22">${label}</span>
    <div class="popup-species">${props.species || props.name || 'Unknown'}</div>
    ${props.latin ? `<div class="popup-latin">${props.latin}</div>` : ''}
    <div class="popup-grid">
      <div class="popup-field"><div class="popup-key">Date</div><div class="popup-val">${props.date || '—'}</div></div>
      <div class="popup-field"><div class="popup-key">Count</div><div class="popup-val">${props.count || '—'}</div></div>
      <div class="popup-field popup-field--full"><div class="popup-key">Habitat</div>
        <div class="popup-val">${props.habitat || props.habitat_type || '—'}</div></div>
    </div>
    ${props.notes ? `<div class="popup-notes">${props.notes}</div>` : ''}
  </div>`;
}

function buildTrailPopup(id, props) {
  const tc = { burley: '#ff8c42', emery: '#ff4d4d', reihan: '#f59e0b' };
  const c  = tc[id] || '#ff8c42';
  return `<div class="popup-inner">
    <span class="popup-badge" style="color:${c};background:${c}22">Trail</span>
    <div class="popup-species">${props.name || 'Trail'}</div>
    <div class="popup-grid">
      <div class="popup-field"><div class="popup-key">Distance</div><div class="popup-val">${props.distance_km || props.length_km || '—'} km</div></div>
      <div class="popup-field"><div class="popup-key">Duration</div><div class="popup-val">${props.duration_hrs || props.time_hrs || '—'} hrs</div></div>
      <div class="popup-field popup-field--full"><div class="popup-key">Difficulty</div><div class="popup-val">${props.difficulty || '—'}</div></div>
    </div>
    ${props.description ? `<div class="popup-notes">${props.description}</div>` : ''}
  </div>`;
}

function buildHabitatPopup(id, props) {
  const expValue  = props.exposure || null;
  const expColour = EXPOSURE[expValue] || '#6dbe3c';
  const badgeColour = id === 'ecohabitat' ? expColour : '#6dbe3c';
  const badgeLabel  = id === 'ecohabitat' && expValue
    ? `${expValue.charAt(0).toUpperCase()+expValue.slice(1)} Exposure` : 'Habitat';
  return `<div class="popup-inner">
    <span class="popup-badge" style="color:${badgeColour};background:${badgeColour}22">${badgeLabel}</span>
    <div class="popup-species">${props.name || props.habitat_type || 'Habitat'}</div>
    <div class="popup-grid">
      <div class="popup-field popup-field--full"><div class="popup-key">Type</div><div class="popup-val">${props.habitat_type || '—'}</div></div>
      <div class="popup-field"><div class="popup-key">Condition</div><div class="popup-val">${props.condition || '—'}</div></div>
      <div class="popup-field"><div class="popup-key">Area (ha)</div><div class="popup-val">${props.area_ha || '—'}</div></div>
      <div class="popup-field popup-field--full"><div class="popup-key">Designation</div><div class="popup-val">${props.designation || '—'}</div></div>
    </div>
    ${props.description ? `<div class="popup-notes">${props.description}</div>` : ''}
  </div>`;
}

// ── LAYER TOGGLE PANEL ────────────────────────────────────────

const TOGGLE_CONFIG = [
  { id: 'trails',    label: 'Trails',       icon: '🥾', colour: '#ff8c42', items: [
    { id: 'burley', label: 'Burley Village Trail', colour: C.burley, isTrail: true, layers: ['burley-casing','burley-glow','burley-layer'] },
    { id: 'emery',  label: 'Emery Down Circle',    colour: C.emery,  isTrail: true, layers: ['emery-casing', 'emery-glow', 'emery-layer']  },
    { id: 'reihan', label: 'Reihainfield Trail',   colour: C.reihan, isTrail: true, layers: ['reihan-casing','reihan-glow','reihan-layer'] }
  ]},
  { id: 'habitat',   label: 'Habitat',      icon: '🌿', colour: '#6dbe3c', items: [
    { id: 'phi',        label: 'PHI New Forest',       colour: C.phi,          layers: ['phi-fill','phi-line','phi-glow'] },
    { id: 'ecohabitat', label: 'Eco Trail Exposure',   colour: EXPOSURE.medium, layers: ['ecohabitat-fill','ecohabitat-line'], hasExposure: true },
    { id: 'boundary',   label: 'Project Boundary',     colour: '#ffffff',       layers: ['boundary-fill','boundary-line'] }
  ]},
  { id: 'bio',       label: 'Biodiversity', icon: '🔬', colour: '#4cde8f', items: [
    { id: 'birds',  label: 'Bird Observations',  colour: C.birds,  layers: ['birds-halo', 'birds-icon', 'birds-point']  },
    { id: 'fungi',  label: 'Fungi Records',      colour: C.fungi,  layers: ['fungi-halo', 'fungi-icon', 'fungi-point']  },
    { id: 'plants', label: 'Plant Observations', colour: C.plants, layers: ['plants-halo','plants-icon','plants-point'] }
  ]}
];

const layerVis = {};

function buildSidePanel() {
  const body = document.getElementById('panel-body');
  body.innerHTML = '';

  TOGGLE_CONFIG.forEach(section => {
    // Section header
    const hdr = document.createElement('div');
    hdr.className = 'section-header open';
    hdr.innerHTML = `
      <div class="section-icon" style="background:${section.colour}22;color:${section.colour}">${section.icon}</div>
      <span class="section-title">${section.label}</span>
      <span class="section-arrow">▾</span>
    `;

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'section-items open';

    hdr.addEventListener('click', () => {
      hdr.classList.toggle('open');
      itemsDiv.classList.toggle('open');
    });

    body.appendChild(hdr);

    // Items
    section.items.forEach(item => {
      layerVis[item.id] = true;

      const row = document.createElement('div');
      row.className = 'layer-row';
      row.dataset.id = item.id;

      const swatchClass = item.isTrail ? 'lr-swatch trail' : 'lr-swatch';
      row.innerHTML = `
        <div class="${swatchClass}" style="background:${item.colour}"></div>
        <span class="lr-label">${item.label}</span>
        <div class="lr-toggle"></div>
      `;

      row.addEventListener('click', () => {
        layerVis[item.id] = !layerVis[item.id];
        const vis = layerVis[item.id] ? 'visible' : 'none';
        item.layers.forEach(lid => {
          if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
        });
        row.classList.toggle('off', !layerVis[item.id]);
      });

      itemsDiv.appendChild(row);

      // Exposure sub-legend for ecohabitat
      if (item.hasExposure) {
        const expDiv = document.createElement('div');
        expDiv.className = 'exposure-legend';
        expDiv.innerHTML = `
          <div class="exp-row"><div class="exp-swatch" style="background:${EXPOSURE.low}"></div>Low exposure</div>
          <div class="exp-row"><div class="exp-swatch" style="background:${EXPOSURE.medium}"></div>Medium exposure</div>
          <div class="exp-row"><div class="exp-swatch" style="background:${EXPOSURE.high}"></div>High exposure</div>
        `;
        itemsDiv.appendChild(expDiv);
      }
    });

    body.appendChild(itemsDiv);
  });
}

buildSidePanel();

// Panel collapse toggle
document.getElementById('panel-tab').addEventListener('click', () => {
  document.getElementById('side-panel').classList.toggle('collapsed');
});

// ── HEADER BUTTONS ────────────────────────────────────────────

document.getElementById('btn-reset').addEventListener('click', () => {
  map.flyTo({ center: MAP_CONFIG.center, zoom: MAP_CONFIG.zoom, pitch: MAP_CONFIG.pitch, bearing: MAP_CONFIG.bearing, speed: 0.9 });
});

let is3D = true;
document.getElementById('btn-3d').addEventListener('click', () => {
  is3D = !is3D;
  map.easeTo({ pitch: is3D ? MAP_CONFIG.pitch : 0, bearing: is3D ? MAP_CONFIG.bearing : 0, duration: 800 });
  document.getElementById('btn-3d').textContent = is3D ? '3D' : '2D';
});

// ── TRAIL EXPLORER ────────────────────────────────────────────

const BIO_DATA = { birds: null, fungi: null, plants: null };
function storeBioData(type, data) { BIO_DATA[type] = data; }

function distanceM(a, b) {
  const R = 6371000, dLat=(b[1]-a[1])*Math.PI/180, dLng=(b[0]-a[0])*Math.PI/180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function nearbyFeatures(lngLat, radiusM) {
  const results = { birds:[], fungi:[], plants:[] };
  const centre  = [lngLat.lng, lngLat.lat];
  Object.entries(BIO_DATA).forEach(([type, data]) => {
    if (!data) return;
    data.features.forEach(f => {
      if (!f.geometry || f.geometry.type !== 'Point') return;
      const d = distanceM(centre, f.geometry.coordinates);
      if (d <= radiusM) results[type].push({ ...f.properties, _dist: Math.round(d) });
    });
  });
  return results;
}

const explorerPanel   = document.getElementById('explorer-panel');
const explorerContent = document.getElementById('explorer-content');
let explorerTimeout   = null;

function showExplorer(lngLat, trailId) {
  clearTimeout(explorerTimeout);
  const nearby = nearbyFeatures(lngLat, 500);
  const bCount = nearby.birds.length, fCount = nearby.fungi.length, pCount = nearby.plants.length;
  const total  = bCount + fCount + pCount;
  const index  = Math.min(10, Math.round(total/5));
  const ic = index >= 7 ? '#4cde8f' : index >= 4 ? '#f59e0b' : '#ff4d4d';
  const tc = { burley:'#ff8c42', emery:'#ff4d4d', reihan:'#f59e0b' };
  const tn = { burley:'Burley Village Trail', emery:'Emery Down Circle', reihan:'Reihainfield Trail' };
  const top = t => nearby[t].sort((a,b)=>a._dist-b._dist).slice(0,3)
    .map(f=>`<div class="exp-item"><span class="exp-dist">${f._dist}m</span><span class="exp-name">${f.species||f.name||'—'}</span></div>`).join('');

  explorerContent.innerHTML = `
    <div class="exp-trail-label" style="color:${tc[trailId]||'#ff8c42'}">${tn[trailId]||'Trail'}</div>
    <div class="exp-index-bar">
      <span class="exp-index-label">Biodiversity Index</span>
      <div class="exp-index-track"><div class="exp-index-fill" style="width:${index*10}%;background:${ic}"></div></div>
      <span class="exp-index-score" style="color:${ic}">${index}/10</span>
    </div>
    <div class="exp-counts">
      <div class="exp-count"><div class="exp-dot" style="background:#4cde8f"></div>${bCount} birds</div>
      <div class="exp-count"><div class="exp-dot" style="background:#c084fc"></div>${fCount} fungi</div>
      <div class="exp-count"><div class="exp-dot" style="background:#22d3ee"></div>${pCount} plants</div>
    </div>
    ${total===0 ? '<div class="exp-empty">No observations within 500m</div>' : ''}
    ${bCount>0 ? `<div class="exp-section"><div class="exp-section-label" style="color:#4cde8f">🐦 Nearby Birds</div>${top('birds')}</div>` : ''}
    ${fCount>0 ? `<div class="exp-section"><div class="exp-section-label" style="color:#c084fc">🍄 Nearby Fungi</div>${top('fungi')}</div>` : ''}
    ${pCount>0 ? `<div class="exp-section"><div class="exp-section-label" style="color:#22d3ee">🌿 Nearby Plants</div>${top('plants')}</div>` : ''}
  `;
  explorerPanel.classList.add('open');
  highlightNearbyPoints(lngLat, 500);
}

function hideExplorer() {
  explorerTimeout = setTimeout(() => { explorerPanel.classList.remove('open'); clearNearbyHighlight(); }, 600);
}

function attachTrailExplorer(id) {
  map.on('mousemove', id+'-layer', e => { if (Object.values(BIO_DATA).some(d=>d!==null)) showExplorer(e.lngLat, id); });
  map.on('mouseleave', id+'-layer', hideExplorer);
}

function highlightNearbyPoints(lngLat, radiusM) {
  const circle = makeCircleGeoJSON(lngLat, radiusM);
  if (map.getSource('proximity-circle')) { map.getSource('proximity-circle').setData(circle); }
  else {
    map.addSource('proximity-circle', { type: 'geojson', data: circle });
    map.addLayer({ id:'proximity-fill', type:'fill', source:'proximity-circle', paint:{'fill-color':'#6dbe3c','fill-opacity':0.06} });
    map.addLayer({ id:'proximity-line', type:'line', source:'proximity-circle', paint:{'line-color':'#6dbe3c','line-width':1.5,'line-opacity':0.45,'line-dasharray':[3,3]} });
  }
}

function clearNearbyHighlight() {
  if (map.getSource('proximity-circle')) map.getSource('proximity-circle').setData({type:'FeatureCollection',features:[]});
}

function makeCircleGeoJSON(lngLat, radiusM) {
  const steps=64, coords=[];
  for (let i=0;i<=steps;i++) {
    const a=(i/steps)*2*Math.PI;
    coords.push([lngLat.lng+(radiusM/111320/Math.cos(lngLat.lat*Math.PI/180))*Math.cos(a), lngLat.lat+(radiusM/110540)*Math.sin(a)]);
  }
  return {type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[coords]}}]};
}

// ── BIODIVERSITY HOTSPOTS ─────────────────────────────────────

let hotspotBuilt = false;
function maybeHotspot() {
  if (hotspotBuilt || !Object.values(BIO_DATA).every(d=>d!==null)) return;
  hotspotBuilt = true; buildHotspotLayer();
}

function buildHotspotLayer() {
  const all=[];
  ['birds','fungi','plants'].forEach(t => { if(!BIO_DATA[t])return; BIO_DATA[t].features.forEach(f=>{ if(f.geometry&&f.geometry.type==='Point') all.push({coords:f.geometry.coordinates,type:t}); }); });
  if(!all.length) return;
  const G=0.003, cells={};
  all.forEach(({coords,type}) => {
    const k=`${Math.floor(coords[0]/G)},${Math.floor(coords[1]/G)}`;
    if(!cells[k]) cells[k]={lng:(Math.floor(coords[0]/G)+.5)*G,lat:(Math.floor(coords[1]/G)+.5)*G,count:0,types:new Set()};
    cells[k].count++; cells[k].types.add(type);
  });
  const hotspots=Object.values(cells).filter(c=>c.types.size>=2&&c.count>=5)
    .map(c=>({type:'Feature',geometry:{type:'Point',coordinates:[c.lng,c.lat]},properties:{count:c.count,types:c.types.size}}));
  if(!hotspots.length) return;
  map.addSource('hotspots',{type:'geojson',data:{type:'FeatureCollection',features:hotspots}});
  map.addLayer({id:'hotspot-glow',type:'circle',source:'hotspots',
    paint:{'circle-radius':['interpolate',['linear'],['get','count'],5,28,80,80],'circle-color':'#f59e0b','circle-opacity':0.1,'circle-stroke-width':2,'circle-stroke-color':'#f59e0b','circle-stroke-opacity':0.3,'circle-blur':0.6}});
  map.addLayer({id:'hotspot-core',type:'circle',source:'hotspots',
    paint:{'circle-radius':7,'circle-color':'#f59e0b','circle-opacity':0.65,'circle-stroke-width':2,'circle-stroke-color':'#fff','circle-stroke-opacity':0.8}});
  map.on('mouseenter','hotspot-core',()=>map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','hotspot-core',()=>map.getCanvas().style.cursor='');
  map.on('click','hotspot-core',e=>{
    const p=e.features[0].properties;
    popup.setLngLat(e.lngLat).setHTML(`<div class="popup-inner"><span class="popup-badge" style="color:#f59e0b;background:#f59e0b22">🔥 Hotspot</span><div class="popup-species">High Activity Zone</div><div class="popup-grid"><div class="popup-field"><div class="popup-key">Observations</div><div class="popup-val">${p.count}</div></div><div class="popup-field"><div class="popup-key">Species groups</div><div class="popup-val">${p.types}/3</div></div></div><div class="popup-notes">Concentrated biodiversity area.</div></div>`).addTo(map);
  });
  console.log(`[hotspots] ✓ ${hotspots.length} hotspots`);
}