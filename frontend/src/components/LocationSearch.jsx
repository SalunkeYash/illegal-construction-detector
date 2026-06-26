import React, { useState, useRef, useEffect } from 'react';
import { useLocationSearch } from '../hooks/useLocationSearch';

const LocationSearch = ({ onLocationSelect, placeholder = 'Search city, area, landmark...', className = '' }) => {
  const { query, setQuery, results, loading, error, search, clearResults } = useLocationSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when results arrive
  useEffect(() => {
    if (results.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    }
  }, [results]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    // Debounce: wait 500ms after last keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(() => search(val), 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else {
        search();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (location) => {
    setQuery(location.shortName);
    setIsOpen(false);
    clearResults();
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <span className="text-gray-400">🔍</span>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && (
            <button onClick={handleClear} className="px-2 text-gray-400 hover:text-gray-600 transition-colors" title="Clear">
              ✕
            </button>
          )}
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            className="px-3 py-1.5 mr-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto animate-fade-in">
          {results.map((loc, idx) => (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors ${
                idx === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <p className="text-sm font-medium text-gray-900 truncate">{loc.shortName}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{loc.name}</p>
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded capitalize">
                {loc.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
