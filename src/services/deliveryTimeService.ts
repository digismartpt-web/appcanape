import { importLibrary } from '@googlemaps/js-api-loader';

let isGoogleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (isGoogleMapsLoaded) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    throw new Error('Google Maps API key not configured');
  }

  // L'initialisation se fait déjà dans main.tsx, mais on s'en assure ici aussi
  // car ce service peut être appelé indépendamment
  const scriptPromise = importLibrary('places').then(() => {
    isGoogleMapsLoaded = true;
  });

  // Timeout de 5 secondes pour ne pas bloquer tout le processus de commande
  googleMapsPromise = Promise.race([
    scriptPromise,
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout loading Google Maps')), 5000)
    )
  ]).catch(err => {
    console.warn('⚠️ Google Maps loading failed or timed out, using fallback values:', err.message);
    isGoogleMapsLoaded = true; // On marque comme "chargé" pour ne plus réessayer de bloquer
  }) as Promise<void>;

  return googleMapsPromise;
};

export interface DeliveryEstimate {
  duration: number;
  distance: number;
}

export const calculateDeliveryTime = async (
  origin: string,
  destination: string
): Promise<DeliveryEstimate> => {
  try {
    await loadGoogleMaps();

    const service = new google.maps.DistanceMatrixService();

    const request: google.maps.DistanceMatrixRequest = {
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    };

    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(request, (response, status) => {
        if (status === 'OK' && response) {
          const result = response.rows[0]?.elements[0];

          if (result && result.status === 'OK') {
            const durationInMinutes = Math.ceil(result.duration.value / 60);
            const distanceInKm = result.distance.value / 1000;

            resolve({
              duration: durationInMinutes,
              distance: distanceInKm
            });
          } else {
            reject(new Error('Unable to calculate route'));
          }
        } else {
          reject(new Error(`Google Maps API error: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Error calculating delivery time:', error);
    return {
      duration: 30,
      distance: 5
    };
  }
};
