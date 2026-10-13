/**
 * Map Basemap Configuration
 * 
 * CARTO basemaps (cartocdn.com) enforce an API key requirement.
 * Without an API key, CARTO stamps "API KEY REQUIRED carto.com/basemaps/apikey" 
 * as watermarks on every tile.
 * 
 * If VITE_CARTO_API_KEY is provided in environment variables, CARTO tiles 
 * are loaded with the key.
 * Otherwise, it falls back to standard OpenStreetMap (OSM) tiles which are
 * 100% free, require no authentication, and display without watermarks.
 */

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;

export const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const getTileConfig = (variant = 'standard', theme = 'light') => {
  if (CARTO_KEY) {
    let url = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
    if (variant === 'light_nolabels') {
      url = `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
    } else if (variant === 'themed') {
      url = theme === 'dark'
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
        : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
    }
    return {
      url,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    };
  }

  // Free default without watermark: OpenStreetMap
  return {
    url: OSM_TILES,
    attribution: OSM_ATTRIBUTION
  };
};
