"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface MapFlyToProps {
  center: [number, number] | null;
  zoom?: number;
  bounds?: [[number, number], [number, number]] | null;
}

export default function MapFlyTo({ center, zoom, bounds }: MapFlyToProps) {
  const map = useMap();
  const lastBoundsKey = useRef<string | null>(null);

  useEffect(() => {
    if (bounds && bounds[0] && bounds[1]) {
      const boundsKey = `${bounds[0][0].toFixed(4)},${bounds[0][1].toFixed(4)}_${bounds[1][0].toFixed(4)},${bounds[1][1].toFixed(4)}`;
      if (lastBoundsKey.current !== boundsKey) {
        lastBoundsKey.current = boundsKey;
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else if (center && center.length === 2) {
      lastBoundsKey.current = null;
      map.flyTo(center, zoom ?? 15, { animate: true, duration: 1 });
    }
  }, [center, zoom, bounds, map]);

  return null;
}
