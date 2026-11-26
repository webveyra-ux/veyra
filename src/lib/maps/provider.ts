export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapsProviderStatus {
  configured: boolean;
  provider: 'none' | 'google';
  reason?: string;
}

export interface MapsProvider {
  getStatus(): MapsProviderStatus;
  getEmbedSearchUrl(query: string): string | null;
}

const configuredProvider = (process.env.NEXT_PUBLIC_MAPS_PROVIDER || 'none') as 'none' | 'google';
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function isKeyValid(key: string): boolean {
  return Boolean(key && !key.startsWith('your-') && !key.includes('YOUR_'));
}

export const mapsProvider: MapsProvider = {
  getStatus(): MapsProviderStatus {
    if (configuredProvider === 'google' && isKeyValid(googleMapsKey)) {
      return {
        configured: true,
        provider: 'google',
      };
    }

    return {
      configured: false,
      provider: 'none',
      reason:
        'Interactive map view is disabled until NEXT_PUBLIC_MAPS_PROVIDER=google and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY are configured.',
    };
  },

  getEmbedSearchUrl(query: string): string | null {
    const status = this.getStatus();
    if (!status.configured) return null;
    const encoded = encodeURIComponent(query);
    return `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(googleMapsKey)}&q=${encoded}`;
  },
};

export function haversineDistanceKm(a: MapCoordinates, b: MapCoordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
