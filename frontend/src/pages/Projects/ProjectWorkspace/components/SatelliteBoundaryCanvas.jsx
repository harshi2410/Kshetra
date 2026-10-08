import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  PenTool, Move, RotateCcw, Trash2, Check, Sparkles, Lock, Unlock,
  Layers, MapPin, ZoomIn, ZoomOut, Maximize2, AlertTriangle, CheckCircle2,
  Search, Eye, ShieldCheck, Compass, Info
} from 'lucide-react';
import {
  geoPolygonToCadPolygon,
  cadPolygonToGeoPolygon,
  checkPolygonSelfIntersection,
  resolveProjectLocation
} from '../../../../utils/geoProjection';

// Satellite Tile Providers (Google Maps, Google Hybrid, Esri, OSM)
const TILE_PROVIDERS = {
  googleHybrid: {
    name: 'Google Satellite (Hybrid)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps'
  },
  google: {
    name: 'Google Satellite',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps'
  },
  googleRoads: {
    name: 'Google Roadmap',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps'
  },
  esri: {
    name: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 20,
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  osm: {
    name: 'OpenStreetMap Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
};

const LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export default function SatelliteBoundaryCanvas({
  project,
  mode = 'DRAW_BOUNDARY', // 'DRAW_BOUNDARY' | 'HYBRID_VIEW'
  existingPolygon = null,
  existingSatelliteCoords = null,
  layoutModel = null,
  plots = [],
  variants = [],
  selectedVariantId = null,
  onSelectVariant = null,
  selectedVariant = null,
  isLocked = false,
  onBoundaryConfirmed,
  onGeneratePlots,
  onClearSatelliteLayout,
  isGenerating = false,
  onToggleLock,
  onOpenPlot,
  onSwitchToCad,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const labelsLayerRef = useRef(null);

  // Drawing state
  const [activeTool, setActiveTool] = useState('DRAW'); // 'DRAW' | 'EDIT' | 'VIEW'
  const [satelliteCoords, setSatelliteCoords] = useState(() => {
    if (existingSatelliteCoords && Array.isArray(existingSatelliteCoords) && existingSatelliteCoords.length >= 3) {
      return existingSatelliteCoords;
    }
    // Check project field
    if (project?.satelliteCoordsJson) {
      try {
        const parsed = JSON.parse(project.satelliteCoordsJson);
        if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Sync coords if prop updates from parent
  useEffect(() => {
    if (existingSatelliteCoords && Array.isArray(existingSatelliteCoords) && existingSatelliteCoords.length >= 3) {
      setSatelliteCoords(existingSatelliteCoords);
    }
  }, [existingSatelliteCoords]);

  const [history, setHistory] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [confirmedData, setConfirmedData] = useState(null);
  const [tileProviderKey, setTileProviderKey] = useState('googleHybrid');
  const [showLabels, setShowLabels] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Layers on map
  const boundaryPolygonLayerRef = useRef(null);
  const vertexMarkersLayerRef = useRef(null);
  const midpointMarkersLayerRef = useRef(null);
  const plotsLayerGroupRef = useRef(null);
  const cursorGuideLineRef = useRef(null);

  // Metrics computation
  const metrics = useMemo(() => {
    return geoPolygonToCadPolygon(satelliteCoords);
  }, [satelliteCoords]);

  // Push state to undo history
  const pushHistory = (coords) => {
    setHistory(prev => [...prev.slice(-15), coords]);
  };

  // ──────────────────────────────── Map Initialization ────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized

    const initialLoc = resolveProjectLocation(project);
    const map = L.map(mapContainerRef.current, {
      center: [initialLoc.lat, initialLoc.lng],
      zoom: initialLoc.zoom,
      maxZoom: 21,
      minZoom: 4,
      zoomControl: false,
      attributionControl: false
    });

    const activeProvider = TILE_PROVIDERS[tileProviderKey] || TILE_PROVIDERS.googleHybrid || TILE_PROVIDERS.esri;
    const tileLayerOpts = {
      maxZoom: activeProvider.maxZoom,
      attribution: activeProvider.attribution
    };
    if (activeProvider.subdomains && activeProvider.subdomains.length > 0) {
      tileLayerOpts.subdomains = activeProvider.subdomains;
    }
    const tileLayer = L.tileLayer(activeProvider.url, tileLayerOpts).addTo(map);
    tileLayerRef.current = tileLayer;

    if (showLabels) {
      const labelsLayer = L.tileLayer(LABELS_URL, { maxZoom: 20, opacity: 0.85 }).addTo(map);
      labelsLayerRef.current = labelsLayer;
    }

    // Layer groups for geometric overlays
    boundaryPolygonLayerRef.current = L.polygon([], {
      color: '#f43f5e',
      weight: 2.8,
      fillColor: 'rgba(244, 63, 94, 0.22)',
      fillOpacity: 0.35,
      dashArray: null,
      interactive: false // non-blocking so clicks pass through to map
    }).addTo(map);

    vertexMarkersLayerRef.current = L.layerGroup().addTo(map);
    midpointMarkersLayerRef.current = L.layerGroup().addTo(map);
    plotsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Invalidate size after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile provider
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    const activeProvider = TILE_PROVIDERS[tileProviderKey] || TILE_PROVIDERS.googleHybrid || TILE_PROVIDERS.esri;
    const tileLayerOpts = {
      maxZoom: activeProvider.maxZoom,
      attribution: activeProvider.attribution
    };
    if (activeProvider.subdomains && activeProvider.subdomains.length > 0) {
      tileLayerOpts.subdomains = activeProvider.subdomains;
    }
    const newTileLayer = L.tileLayer(activeProvider.url, tileLayerOpts).addTo(mapRef.current);
    tileLayerRef.current = newTileLayer;
    newTileLayer.bringToBack();
  }, [tileProviderKey]);

  // Toggle reference labels
  useEffect(() => {
    if (!mapRef.current) return;
    if (showLabels) {
      if (!labelsLayerRef.current) {
        labelsLayerRef.current = L.tileLayer(LABELS_URL, { maxZoom: 20, opacity: 0.85 }).addTo(mapRef.current);
      }
    } else {
      if (labelsLayerRef.current) {
        mapRef.current.removeLayer(labelsLayerRef.current);
        labelsLayerRef.current = null;
      }
    }
  }, [showLabels]);

  // Fit bounds if coords exist
  useEffect(() => {
    if (!mapRef.current) return;
    if (satelliteCoords && satelliteCoords.length >= 3) {
      const bounds = L.latLngBounds(satelliteCoords);
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
      }
    }
  }, []);

  // ──────────────────────────────── Drawing & Editing Handlers ────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (activeTool !== 'DRAW') return;

    const newPt = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))];

    // If clicking near the first point and we have >= 3 points, close the boundary
    if (satelliteCoords.length >= 3) {
      const first = satelliteCoords[0];
      const dist = mapRef.current.distance(e.latlng, L.latLng(first[0], first[1]));
      // If within 15 meters on ground, auto-close
      if (dist < 15) {
        setActiveTool('EDIT');
        setValidationError('');
        return;
      }
    }

    pushHistory(satelliteCoords);
    setSatelliteCoords(prev => [...prev, newPt]);
    setValidationError('');
  }, [activeTool, satelliteCoords]);

  useEffect(() => {
    const map = mapRef.current;
    const poly = boundaryPolygonLayerRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    if (poly) poly.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
      if (poly) poly.off('click', handleMapClick);
    };
  }, [handleMapClick]);

  // Render Polygon and Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const polyLayer = boundaryPolygonLayerRef.current;
    const vertexGroup = vertexMarkersLayerRef.current;
    const midpointGroup = midpointMarkersLayerRef.current;

    if (!polyLayer || !vertexGroup || !midpointGroup) return;

    // 1. Update master boundary polygon
    if (satelliteCoords.length >= 2) {
      polyLayer.setLatLngs(satelliteCoords);
      polyLayer.setStyle({
        color: validationError ? '#ef4444' : '#f43f5e',
        fillColor: validationError ? 'rgba(239, 68, 68, 0.25)' : 'rgba(244, 63, 94, 0.22)',
        dashArray: activeTool === 'DRAW' ? '6, 6' : null
      });
    } else {
      polyLayer.setLatLngs([]);
    }

    // 2. Update Vertex Markers
    vertexGroup.clearLayers();
    midpointGroup.clearLayers();

    // In HYBRID_VIEW mode without editing, hide markers
    if (mode === 'HYBRID_VIEW' && activeTool === 'VIEW') {
      return;
    }

    satelliteCoords.forEach((pt, idx) => {
      const isStart = idx === 0;
      const isLast = idx === satelliteCoords.length - 1;
      const icon = L.divIcon({
        className: 'landos-vertex-icon',
        html: `
          <div style="
            width: ${isStart ? '18px' : '14px'};
            height: ${isStart ? '18px' : '14px'};
            background: ${isStart ? '#10b981' : '#f43f5e'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 8px;
            font-weight: 800;
            cursor: ${isLocked ? 'default' : 'grab'};
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [isStart ? 18 : 14, isStart ? 18 : 14],
        iconAnchor: [isStart ? 9 : 7, isStart ? 9 : 7]
      });

      const marker = L.marker([pt[0], pt[1]], {
        icon,
        draggable: !isLocked && activeTool === 'EDIT'
      });

      // Click start vertex in DRAW mode to close the polygon
      if (isStart && activeTool === 'DRAW' && satelliteCoords.length >= 3) {
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setActiveTool('EDIT');
          setValidationError('');
        });
      }

      // Drag to move point
      marker.on('dragstart', () => {
        pushHistory(satelliteCoords);
      });

      marker.on('drag', (e) => {
        const movedLatLng = e.target.getLatLng();
        setSatelliteCoords(curr => {
          const next = [...curr];
          next[idx] = [Number(movedLatLng.lat.toFixed(6)), Number(movedLatLng.lng.toFixed(6))];
          return next;
        });
      });

      // Right click or click to delete in EDIT mode
      marker.on('contextmenu', () => {
        if (isLocked) return;
        if (satelliteCoords.length > 3) {
          pushHistory(satelliteCoords);
          setSatelliteCoords(curr => curr.filter((_, i) => i !== idx));
        }
      });

      vertexGroup.addLayer(marker);
    });

    // 3. Add edge midpoints for adding vertices in EDIT mode
    if (!isLocked && activeTool === 'EDIT' && satelliteCoords.length >= 3) {
      for (let i = 0; i < satelliteCoords.length; i++) {
        const p1 = satelliteCoords[i];
        const p2 = satelliteCoords[(i + 1) % satelliteCoords.length];
        const midLat = (p1[0] + p2[0]) / 2;
        const midLng = (p1[1] + p2[1]) / 2;

        const midIcon = L.divIcon({
          className: 'landos-mid-icon',
          html: `
            <div style="
              width: 10px;
              height: 10px;
              background: rgba(255, 255, 255, 0.9);
              border: 1.5px solid #f43f5e;
              border-radius: 50%;
              box-shadow: 0 0 6px rgba(0,0,0,0.5);
              cursor: pointer;
              transition: transform 0.15s ease;
            " title="Click to insert point here"></div>
          `,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });

        const midMarker = L.marker([midLat, midLng], { icon: midIcon });
        midMarker.on('click', () => {
          pushHistory(satelliteCoords);
          const next = [...satelliteCoords];
          next.splice(i + 1, 0, [Number(midLat.toFixed(6)), Number(midLng.toFixed(6))]);
          setSatelliteCoords(next);
        });
        midpointGroup.addLayer(midMarker);
      }
    }
  }, [satelliteCoords, activeTool, isLocked, validationError, mode]);

  // ──────────────────────────────── Render Hybrid Plots & Roads on Satellite ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const plotsGroup = plotsLayerGroupRef.current;
    if (!map || !plotsGroup) return;

    plotsGroup.clearLayers();

    // Do NOT render plots if activeTool is DRAW or if there are no satelliteCoords
    if (activeTool === 'DRAW') return;
    if (!satelliteCoords || satelliteCoords.length < 3) return;

    // Render CAD plot to Lat/Lng strictly inside the drawn satellite boundary
    if (layoutModel && layoutModel.plots && metrics.refCenter) {
      const { refCenter } = metrics;

      // 1. Draw Roads
      if (layoutModel.roads && Array.isArray(layoutModel.roads)) {
        layoutModel.roads.forEach(road => {
          if (road.corridorPolygon && Array.isArray(road.corridorPolygon)) {
            const geoRoad = cadPolygonToGeoPolygon(road.corridorPolygon, refCenter);
            if (geoRoad.length >= 3) {
              const roadPoly = L.polygon(geoRoad, {
                color: '#475569',
                weight: 1.5,
                fillColor: '#1e293b',
                fillOpacity: 0.65
              });
              roadPoly.bindTooltip(`Road: ${road.roadName || 'Internal ROW'} (${road.widthFt || 30} FT)`, { sticky: true });
              plotsGroup.addLayer(roadPoly);
            }
          }
        });
      }

      // 2. Draw Open Spaces & Amenities
      if (layoutModel.amenities && Array.isArray(layoutModel.amenities)) {
        layoutModel.amenities.forEach(am => {
          if (am.polygon && Array.isArray(am.polygon)) {
            const geoAm = cadPolygonToGeoPolygon(am.polygon, refCenter);
            if (geoAm.length >= 3) {
              const isGreen = am.type === 'GARDEN' || am.type === 'OPEN_SPACE' || !am.type;
              const amPoly = L.polygon(geoAm, {
                color: isGreen ? '#16a34a' : '#2563eb',
                weight: 1.5,
                fillColor: isGreen ? 'rgba(34, 197, 94, 0.45)' : 'rgba(59, 130, 246, 0.45)',
                fillOpacity: 0.55
              });
              amPoly.bindTooltip(`${am.name || (isGreen ? 'Open Space' : 'Amenity')} • ${Math.round(am.areaSqft || 0)} SQFT`, { sticky: true });
              plotsGroup.addLayer(amPoly);
            }
          }
        });
      }

      // 3. Draw Generated Plots (Strict Green/Red System)
      layoutModel.plots.forEach(plot => {
        const cadPoly = plot.polygon || plot.coordinates;
        if (!cadPoly || cadPoly.length < 3) return;

        const geoPoly = cadPolygonToGeoPolygon(cadPoly, refCenter);
        if (geoPoly.length < 3) return;

        // Check sold status
        const dbPlot = plots.find(p => p.id === plot.plotId || p.plotNo === plot.plotNumber || p.plotNumber === plot.plotNumber);
        const currentStatus = dbPlot?.status || plot.status || 'AVAILABLE';
        const isSold = currentStatus.toUpperCase() === 'SOLD' || currentStatus.toUpperCase() === 'BOOKED';

        const fillColor = isSold ? 'rgba(239, 68, 68, 0.40)' : 'rgba(34, 197, 94, 0.35)';
        const strokeColor = isSold ? '#ef4444' : '#22c55e';

        const poly = L.polygon(geoPoly, {
          color: strokeColor,
          weight: 1.6,
          fillColor: fillColor,
          fillOpacity: 0.75
        });

        // Hover & Tooltip
        const plotNo = plot.plotNumber || plot.plotNo;
        poly.bindTooltip(`
          <div style="font-family: sans-serif; font-size: 11px; padding: 3px 6px;">
            <div style="font-weight: 800; color: ${isSold ? '#ef4444' : '#22c55e'};">
              Plot ${plotNo} • ${isSold ? 'SOLD' : 'AVAILABLE'}
            </div>
            <div style="color: #cbd5e1; margin-top: 2px;">
              ${plot.areaSqft?.toLocaleString()} SQFT (${Math.round((plot.areaSqft || 0) * 0.0929)} m²)
            </div>
            <div style="color: #94a3b8; font-size: 10px;">
              ${plot.dimensions || `${plot.widthFt || 30} × ${plot.depthFt || 40} FT`} • ${plot.facing || 'NORTH'}
            </div>
          </div>
        `, { sticky: true, opacity: 0.95 });

        poly.on('mouseover', () => {
          poly.setStyle({ weight: 2.8, fillOpacity: 0.9 });
        });
        poly.on('mouseout', () => {
          poly.setStyle({ weight: 1.6, fillOpacity: 0.75 });
        });

        // Click to open plot details drawer
        poly.on('click', () => {
          if (onOpenPlot) {
            onOpenPlot(dbPlot || plot);
          }
        });

        plotsGroup.addLayer(poly);

        // Center Plot Number Label
        if (geoPoly.length >= 3) {
          const lats = geoPoly.map(p => p[0]);
          const lngs = geoPoly.map(p => p[1]);
          const cLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const cLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

          const labelIcon = L.divIcon({
            className: 'landos-plot-num-label',
            html: `
              <div style="
                background: ${isSold ? 'rgba(220,38,38,0.85)' : 'rgba(15,23,42,0.80)'};
                border: 1px solid ${isSold ? '#ef4444' : '#22c55e'};
                color: #ffffff;
                font-size: 9px;
                font-weight: 800;
                padding: 1px 4px;
                border-radius: 3px;
                white-space: nowrap;
                pointer-events: none;
                transform: translate(-50%, -50%);
                box-shadow: 0 1px 4px rgba(0,0,0,0.5);
              ">
                ${plotNo}
              </div>
            `,
            iconSize: [28, 14],
            iconAnchor: [14, 7]
          });

          const labelMarker = L.marker([cLat, cLng], { icon: labelIcon, interactive: false });
          plotsGroup.addLayer(labelMarker);
        }
      });
    }
  }, [layoutModel, plots, metrics, onOpenPlot]);

  // ──────────────────────────────── Action Callbacks ────────────────────────────────
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setSatelliteCoords(prev);
    setValidationError('');
  };

  const handleClear = () => {
    if (isLocked) return;
    if (satelliteCoords.length === 0) return;
    if (window.confirm('Clear current satellite boundary points?')) {
      pushHistory(satelliteCoords);
      setSatelliteCoords([]);
      setValidationError('');
      setConfirmedData(null);
    }
  };

  const handleConfirmBoundary = async () => {
    if (satelliteCoords.length < 3) {
      setValidationError('Boundary must contain at least 3 vertices to form an enclosed land parcel.');
      return;
    }

    // 1. Check self intersections
    const intersectionCheck = checkPolygonSelfIntersection(satelliteCoords);
    if (intersectionCheck.hasIntersection) {
      setValidationError(intersectionCheck.message);
      return;
    }

    // 2. Convert to CAD coordinates & metrics
    const { cadPolygon, areaSqm, areaSqft, lengthFt, breadthFt, perimeterFt } = geoPolygonToCadPolygon(satelliteCoords);
    if (areaSqm < 100) {
      setValidationError(`Land area (${areaSqm} m²) is too small for a valid layout parcel.`);
      return;
    }

    setValidationError('');

    const payload = {
      satelliteCoords,
      polygonVertices: cadPolygon,
      polygon: cadPolygon,
      areaSqm,
      areaSqft,
      lengthFt,
      breadthFt,
      perimeterFt,
      boundaryPointsCount: satelliteCoords.length,
      status: 'CONFIRMED'
    };

    setConfirmedData(payload);
    setActiveTool('VIEW');

    // 3. Callback to parent & API persistence (triggers layout generation cleanly in parent)
    if (onBoundaryConfirmed) {
      onBoundaryConfirmed(payload);
    } else if (onGeneratePlots) {
      // Fallback if standalone generator
      onGeneratePlots(cadPolygon, lengthFt, breadthFt, satelliteCoords);
    }
  };

  // Quick geocode search for project location
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const q = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 18);
      } else {
        alert(`Location "${searchQuery}" not found. Try adding city or state (e.g. "${searchQuery}, Pune").`);
      }
    } catch (err) {
      console.warn('Geocode search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Leaflet Map Canvas Target */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#070c16',
          cursor: activeTool === 'DRAW' ? 'crosshair' : (activeTool === 'EDIT' ? 'default' : 'grab')
        }}
      />

      {/* ──────────────── Top Contextual Floating Toolbar ──────────────── */}
      <div style={{
        position: 'absolute', top: '12px', left: '12px', zIndex: 500,
        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '5px 8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        {/* Draw Tool */}
        <button
          onClick={() => {
            setActiveTool('DRAW');
            setValidationError('');
            if (isLocked && onToggleLock) {
              onToggleLock(false);
            }
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px',
            borderRadius: '5px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer',
            background: activeTool === 'DRAW' ? 'var(--df-accent)' : 'rgba(255,255,255,0.06)',
            color: activeTool === 'DRAW' ? '#ffffff' : '#cbd5e1',
            opacity: 1, transition: 'all 0.15s ease'
          }}
          title="Click points around property boundary"
        >
          <PenTool style={{ width: '13px', height: '13px' }} />
          Draw Boundary
        </button>

        {/* Edit / Move Vertices Tool */}
        <button
          onClick={() => { setActiveTool('EDIT'); setValidationError(''); }}
          disabled={satelliteCoords.length < 3}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px',
            borderRadius: '5px', fontSize: '0.72rem', fontWeight: 800, border: 'none',
            cursor: satelliteCoords.length < 3 ? 'not-allowed' : 'pointer',
            background: activeTool === 'EDIT' ? 'var(--df-accent)' : 'rgba(255,255,255,0.06)',
            color: activeTool === 'EDIT' ? '#ffffff' : '#cbd5e1',
            opacity: satelliteCoords.length < 3 ? 0.5 : 1, transition: 'all 0.15s ease'
          }}
          title="Drag vertices or click edge midpoints to edit boundary"
        >
          <Move style={{ width: '13px', height: '13px' }} />
          Edit Points
        </button>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 8px',
            borderRadius: '5px', fontSize: '0.70rem', fontWeight: 700, border: 'none',
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
            opacity: history.length === 0 ? 0.4 : 1
          }}
          title="Undo last vertex"
        >
          <RotateCcw style={{ width: '12px', height: '12px' }} /> Undo
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={satelliteCoords.length === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 8px',
            borderRadius: '5px', fontSize: '0.70rem', fontWeight: 700, border: 'none',
            cursor: satelliteCoords.length === 0 ? 'not-allowed' : 'pointer',
            background: 'rgba(239,68,68,0.15)', color: '#f87171',
            opacity: satelliteCoords.length === 0 ? 0.4 : 1
          }}
          title="Clear all points"
        >
          <Trash2 style={{ width: '12px', height: '12px' }} /> Clear
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Confirm Boundary Button (Primary Action) */}
        <button
          onClick={handleConfirmBoundary}
          disabled={satelliteCoords.length < 3 || isGenerating}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 14px',
            borderRadius: '5px', fontSize: '0.74rem', fontWeight: 800, border: 'none',
            cursor: (satelliteCoords.length < 3 || isGenerating) ? 'not-allowed' : 'pointer',
            background: satelliteCoords.length < 3 ? 'rgba(255,255,255,0.1)' : 'var(--df-accent)',
            color: '#ffffff',
            boxShadow: satelliteCoords.length >= 3 ? '0 2px 8px rgba(159,18,57,0.45)' : 'none',
            opacity: (satelliteCoords.length < 3 || isGenerating) ? 0.5 : 1,
            transition: 'all 0.15s ease'
          }}
          title="Validate boundary and generate plots inside exact constraint"
        >
          {isGenerating ? <Sparkles style={{ width: '13px', height: '13px' }} /> : <Check style={{ width: '13px', height: '13px' }} />}
          {isGenerating ? 'Generating Plots…' : (confirmedData ? 'Re-Generate Plots' : 'Confirm & Generate Plots')}
        </button>

        {/* Lock Boundary Toggle */}
        {onToggleLock && (
          <button
            onClick={() => onToggleLock(!isLocked)}
            disabled={satelliteCoords.length < 3}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px',
              borderRadius: '5px', fontSize: '0.70rem', fontWeight: 700, border: 'none',
              cursor: satelliteCoords.length < 3 ? 'not-allowed' : 'pointer',
              background: (isLocked && satelliteCoords.length >= 3) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
              color: (isLocked && satelliteCoords.length >= 3) ? '#10b981' : '#cbd5e1',
              opacity: satelliteCoords.length < 3 ? 0.4 : 1
            }}
            title={(isLocked && satelliteCoords.length >= 3) ? 'Boundary is Locked — Click to Unlock & Edit' : 'Click to Lock Boundary'}
          >
            {(isLocked && satelliteCoords.length >= 3) ? <Lock style={{ width: '12px', height: '12px' }} /> : <Unlock style={{ width: '12px', height: '12px' }} />}
            {(isLocked && satelliteCoords.length >= 3) ? 'Locked' : 'Lock'}
          </button>
        )}
      </div>

      {/* ──────────────── Top Center Variant Selector (When Plots are Generated) ──────────────── */}
      {variants && variants.length > 1 && layoutModel && activeTool !== 'DRAW' && (
        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px', padding: '4px 8px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
        }}>
          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', padding: '0 4px', textTransform: 'uppercase' }}>
            Layouts:
          </span>
          {variants.map((v, idx) => {
            const isSelected = v.id === selectedVariantId || (selectedVariant && selectedVariant.id === v.id) || (idx === 0 && !selectedVariantId);
            return (
              <button
                key={v.id || idx}
                onClick={() => onSelectVariant && onSelectVariant(v.id)}
                style={{
                  padding: '3px 9px', borderRadius: '14px', fontSize: '0.68rem', fontWeight: 800,
                  border: isSelected ? '1px solid #10b981' : '1px solid transparent',
                  background: isSelected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isSelected ? '#10b981' : '#cbd5e1',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <span>{v.strategyName || v.optionBadge || `Option ${idx + 1}`}</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>({v.totalPlots || 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ──────────────── Generating Loading HUD ──────────────── */}
      {isGenerating && (
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 550,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(244, 63, 94, 0.6)', borderRadius: '24px', padding: '8px 20px',
          color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 30px rgba(244, 63, 94, 0.45)'
        }}>
          <Sparkles style={{ width: '16px', height: '16px', color: '#f43f5e' }} />
          <span>Generating UDCPR compliant plot layouts strictly inside your boundary…</span>
        </div>
      )}

      {/* ──────────────── Top-Right Search & Layer Controls ──────────────── */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px', zIndex: 500,
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        {/* Location Search Bar */}
        <form onSubmit={handleSearchLocation} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '2px 8px',
            backdropFilter: 'blur(10px)', boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}>
            <Search style={{ width: '12px', height: '12px', color: '#94a3b8', marginRight: '5px' }} />
            <input
              type="text"
              placeholder="Search site location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none', color: '#ffffff',
                fontSize: '0.70rem', width: '130px'
              }}
            />
            {isSearching && (
              <span style={{ fontSize: '0.65rem', color: '#f43f5e' }}>…</span>
            )}
          </div>
        </form>

        {/* Tile Provider Switcher */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px', padding: '2px 6px', backdropFilter: 'blur(10px)'
        }}>
          <select
            value={tileProviderKey}
            onChange={(e) => setTileProviderKey(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none', color: '#cbd5e1',
              fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <option value="googleHybrid" style={{ background: '#0f172a' }}>Google Satellite (Hybrid)</option>
            <option value="google" style={{ background: '#0f172a' }}>Google Satellite</option>
            <option value="googleRoads" style={{ background: '#0f172a' }}>Google Maps</option>
            <option value="esri" style={{ background: '#0f172a' }}>Esri Satellite</option>
            <option value="osm" style={{ background: '#0f172a' }}>OpenStreetMap</option>
          </select>
        </div>

        {/* Labels Overlay Toggle */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          style={{
            padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
            background: showLabels ? 'var(--df-accent)' : 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff', backdropFilter: 'blur(10px)'
          }}
          title="Toggle Roads & Place Labels"
        >
          Labels
        </button>

        {/* 2D CAD Switcher Shortcut */}
        {onSwitchToCad && layoutModel && (
          <button
            onClick={onSwitchToCad}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              background: 'rgba(15, 23, 42, 0.92)', color: '#38bdf8', backdropFilter: 'blur(10px)'
            }}
            title="Switch to 2D CAD engineering plan view"
          >
            📐 2D CAD
          </button>
        )}
      </div>

      {/* ──────────────── Validation Error Banner ──────────────── */}
      {validationError && (
        <div style={{
          position: 'absolute', top: '56px', left: '12px', zIndex: 500,
          background: 'rgba(239, 68, 68, 0.95)', border: '1px solid #fca5a5',
          borderRadius: '6px', padding: '8px 14px', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700,
          boxShadow: '0 4px 16px rgba(220,38,38,0.5)', display: 'flex', alignItems: 'center', gap: '8px',
          maxWidth: '460px', animation: 'landos-fade-in 0.2s ease-out'
        }}>
          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* ──────────────── Real-Time Area & Boundary Confirmation Info Box ──────────────── */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '12px', zIndex: 500,
        background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: '220px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {satelliteCoords.length >= 3 && (confirmedData || isLocked) ? (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 style={{ width: '13px', height: '13px' }} /> Boundary Confirmed ✓
              </span>
            ) : (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PenTool style={{ width: '12px', height: '12px' }} />
                {activeTool === 'DRAW' ? (satelliteCoords.length === 0 ? 'Click Map to Draw' : `Drawing Boundary (${satelliteCoords.length} pts)`) : 'Boundary Placed'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>
            {satelliteCoords.length} Points
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px', fontSize: '0.70rem' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700 }}>Land Area</div>
            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.82rem' }}>
              {metrics.areaSqm > 0 ? `${metrics.areaSqm.toLocaleString()} m²` : '—'}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.64rem' }}>
              {metrics.areaSqft > 0 ? `${metrics.areaSqft.toLocaleString()} SQFT` : ''}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700 }}>Perimeter</div>
            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.82rem' }}>
              {metrics.perimeterM > 0 ? `${metrics.perimeterM.toLocaleString()} M` : '—'}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.64rem' }}>
              {metrics.perimeterFt > 0 ? `${metrics.perimeterFt.toLocaleString()} FT` : ''}
            </div>
          </div>
        </div>

        {/* Layout Summary if Plots are Generated for this Satellite Boundary */}
        {layoutModel?.statistics && satelliteCoords.length >= 3 && activeTool !== 'DRAW' && (
          <div style={{
            marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem'
          }}>
            <span style={{ color: '#22c55e', fontWeight: 800 }}>
              Plots: {layoutModel.statistics.totalPlots} Generated
            </span>
            <span style={{ color: '#cbd5e1' }}>
              Roads: {layoutModel.statistics.totalRoadAreaSqm || Math.round((layoutModel.statistics.totalRoadAreaSqft || 0) * 0.0929)} m²
            </span>
            <span style={{ color: '#38bdf8', fontWeight: 800 }}>
              {layoutModel.statistics.utilizationPercent}% Usable
            </span>
          </div>
        )}
      </div>

      {/* ──────────────── Quick Drawing Instruction Banner (When Starting) ──────────────── */}
      {satelliteCoords.length === 0 && activeTool === 'DRAW' && (
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '20px', padding: '6px 16px',
          color: '#ffffff', fontSize: '0.74rem', fontWeight: 700, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{ color: '#f43f5e' }}>●</span>
          <span>Click points around property boundary to draw the actual land parcel</span>
        </div>
      )}

      {/* ──────────────── Map Zoom & Compass HUD (Bottom-Right) ──────────────── */}
      <div style={{
        position: 'absolute', bottom: '16px', right: '12px', zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: '6px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
        }}>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Zoom In"
          >
            <ZoomIn style={{ width: '14px', height: '14px' }} />
          </button>
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Zoom Out"
          >
            <ZoomOut style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px', padding: '4px', textAlign: 'center',
          backdropFilter: 'blur(10px)', color: '#f43f5e', fontSize: '0.68rem', fontWeight: 800
        }}>
          🧭 N ↑
        </div>
      </div>

    </div>
  );
}
