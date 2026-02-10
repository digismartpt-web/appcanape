import { setOptions } from '@googlemaps/js-api-loader';

export const initGoogleMaps = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.error('🗺️ Google Maps API Key missing');
        return false;
    }

    setOptions({
        key: apiKey,
        v: 'weekly',
        libraries: ['places']
    });

    return true;
};
