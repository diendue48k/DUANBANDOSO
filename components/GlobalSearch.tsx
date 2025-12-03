
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Site, Person, ViewMode } from '../types';
import { SearchIcon, LocationMarkerIcon, UsersIcon, MenuIcon, XIcon } from './Icons';

interface GlobalSearchProps {
  allSites: Site[];
  allPersons: Person[];
  viewMode: ViewMode;
  onSelect: (item: Site | Person) => void;
  onMenuClick?: () => void; // For mobile menu/sheet toggle
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ allSites, allPersons, viewMode, onSelect, onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const lowercasedTerm = searchTerm.toLowerCase();
    
    // Simple priority: Starts with > Includes
    const filterFn = (name: string) => name.toLowerCase().includes(lowercasedTerm);

    const sites = allSites.filter(site => filterFn(site.site_name)).slice(0, 5);
    const persons = allPersons.filter(person => filterFn(person.full_name)).slice(0, 3);
      
    return viewMode === 'sites' ? [...sites, ...persons] : [...persons, ...sites];

  }, [searchTerm, allSites, allPersons, viewMode]);
  
  const handleSelect = (item: Site | Person) => {
    onSelect(item);
    setSearchTerm('');
    setIsFocused(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={searchContainerRef}>
      <div className={`
        relative flex items-center w-full bg-slate-800 text-white rounded-full transition-shadow duration-200
        ${isFocused ? 'shadow-lg ring-2 ring-sky-500/50' : 'shadow-md'}
        border border-slate-700
      `}>
        
        {/* Mobile Menu / Icon */}
        <button 
            className="pl-3 pr-2 py-3 text-slate-400 hover:text-white md:cursor-default md:hover:text-slate-400"
            onClick={onMenuClick} // Only does something on mobile if props passed
        >
             {/* Show Menu icon on mobile, Search icon on Desktop could act as decor */}
             <div className="md:hidden">
                <MenuIcon className="h-6 w-6" />
             </div>
             <div className="hidden md:block">
                <SearchIcon className="h-5 w-5" />
             </div>
        </button>

        <input
          type="text"
          placeholder="Tìm địa điểm, nhân vật..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="flex-grow bg-transparent border-none py-3 text-base text-slate-100 placeholder-slate-400 focus:ring-0 focus:outline-none"
        />
        
        {searchTerm ? (
            <button 
                onClick={() => setSearchTerm('')}
                className="p-2 mr-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50"
            >
                <XIcon className="h-5 w-5" />
            </button>
        ) : (
            /* Spacer or Voice Icon placeholder */
             <div className="w-4 mr-2"></div>
        )}
      </div>

      {isFocused && searchResults.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-[60vh] overflow-y-auto z-50 animate-fade-in-overlay">
          <ul className="py-2">
            {searchResults.map((item, index) => {
              const isSite = 'site_id' in item;
              return (
                <li
                  key={isSite ? `s-${item.site_id}` : `p-${item.person_id}`}
                  onClick={() => handleSelect(item)}
                  className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/30 last:border-0"
                >
                  <div className="bg-slate-700 p-2 rounded-full mr-3 text-sky-400 flex-shrink-0">
                    {isSite ? <LocationMarkerIcon className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {isSite ? (item as Site).site_name : (item as Person).full_name}
                    </p>
                    <p className="text-xs text-slate-400 capitalize truncate">
                      {isSite ? (item as Site).site_type : `Nhân vật (${(item as Person).birth_year || '?'} - ${(item as Person).death_year || '?'})`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ViewModeToggle: React.FC<{ viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void }> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex gap-2 w-full md:w-auto pointer-events-auto">
      <button
        onClick={() => onViewModeChange('sites')}
        className={`
          flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-full text-sm font-bold transition-all shadow-lg border
          ${viewMode === 'sites' 
            ? 'bg-sky-600 border-sky-500 text-white ring-2 ring-sky-400/20' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}
        `}
      >
        <LocationMarkerIcon className="h-4 w-4" />
        <span>Địa điểm</span>
      </button>
      
      <button
        onClick={() => onViewModeChange('persons')}
        className={`
          flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-full text-sm font-bold transition-all shadow-lg border
          ${viewMode === 'persons' 
            ? 'bg-sky-600 border-sky-500 text-white ring-2 ring-sky-400/20' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}
        `}
      >
        <UsersIcon className="h-4 w-4" />
        <span>Nhân vật</span>
      </button>
    </div>
  );
};
