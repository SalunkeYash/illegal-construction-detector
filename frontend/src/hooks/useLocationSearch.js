import { useState, useCallback } from 'react';

export function useLocationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchQuery) => {
    const q = (searchQuery || query || '').trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q + ', India');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '6');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('countrycodes', 'in');

      const res = await fetch(url.toString(), {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'IllegalConstructionDetector/1.0',
        },
      });

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      if (data.length === 0) {
        setError('No locations found. Try a different search term.');
      } else {
        setResults(
          data.map((item) => ({
            id: item.place_id,
            name: item.display_name,
            shortName: item.name || item.display_name.split(',')[0],
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type,
            boundingbox: item.boundingbox,
          }))
        );
      }
    } catch (e) {
      setError('Search failed. Check internet connection.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { query, setQuery, results, loading, error, search, clearResults };
}

export default useLocationSearch;
