import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// A component to sync the leaflet map's center/zoom with the provided georeference state
const MapController = ({ georef, onGeorefChange }) => {
  const map = useMap();

  useEffect(() => {
    if (georef.latitude && georef.longitude) {
      map.setView([georef.latitude, georef.longitude], georef.zoom || 18);
    }
  }, [georef.latitude, georef.longitude, map]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (
        center.lat !== georef.latitude ||
        center.lng !== georef.longitude ||
        zoom !== georef.zoom
      ) {
        onGeorefChange({
          ...georef,
          latitude: center.lat,
          longitude: center.lng,
          zoom: zoom
        });
      }
    };
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, georef, onGeorefChange]);

  return null;
};

export const MapProvider = ({ georef, onGeorefChange, children, style }) => {
  // If no lat/lng is provided yet, fallback to a default location or generic center
  const defaultCenter = [georef.latitude || 28.7041, georef.longitude || 77.1025]; // default: New Delhi
  const defaultZoom = georef.zoom || 18;

  return (
    <div style={{ ...style, width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        zoomControl={false}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={22}
          maxNativeZoom={19}
        />
        <MapController georef={georef} onGeorefChange={onGeorefChange} />
      </MapContainer>
      
      {/* 
        The layout geometry SVG overlay will be rendered here.
        It sits on top of the MapContainer with pointer-events disabled or specifically handled.
      */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
