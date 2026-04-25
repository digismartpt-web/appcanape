import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapProps {
  center: {
    lat: number;
    lng: number;
  };
}

export const MapDisplay: React.FC<MapProps> = ({ center }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (mapRef.current && !map) {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
      });

      loader.load().then(() => {
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: center,
          zoom: 12,
        });

        const marker = new google.maps.Marker({
          position: center,
          map: mapInstance,
        });

        setMap(mapInstance);
      });
    }
  }, [center, map, mapRef]);

  useEffect(() => {
    return () => {
      if (map) {
        map.setMap(null);
      }
    };
  }, [map]);

  return <div ref={mapRef} className="h-64 w-full rounded shadow"></div>;
};
