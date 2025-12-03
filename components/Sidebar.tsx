
import React, { useRef, useEffect } from 'react';
import { Site, Person, ViewMode } from '../types';
import { LocationMarkerIcon, UsersIcon, XIcon, ChevronLeftIcon } from './Icons';

interface SidebarProps {
  items: (Site | Person)[];
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  listTitle: string;
  onSearch: (term: string) => void;
  onFilter: (type: string) => void;
  siteTypes: string[];
  selectedType: string;
  isLoading: boolean;
  onSiteSelect: (site: Site) => void;
  onPersonSelect: (person: Person) => void;
  selectedItem: Site | Person | null;
  
  // New props for mobile sheet control
  mobileSheetState: 'collapsed' | 'half' | 'full';
  setMobileSheetState: (state: 'collapsed' | 'half' | 'full') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    items, viewMode, listTitle, isLoading, onSiteSelect, onPersonSelect, selectedItem,
    mobileSheetState, setMobileSheetState
}) => {

  const isItemSelected = (item: Site | Person) => {
      if (!selectedItem) return false;
      if ('site_id' in item && 'site_id' in selectedItem) {
          return item.site_id === selectedItem.site_id;
      }
      if ('person_id' in item && 'person_id' in selectedItem) {
          return item.person_id === selectedItem.person_id;
      }
      return false;
  }
  
  // Calculate Classes based on mobile state
  // Desktop: relative w-1/4 h-full
  // Mobile: fixed bottom-0 w-full z-20 rounded-t-xl transition-all
  
  const getMobileHeightClass = () => {
      switch(mobileSheetState) {
          case 'collapsed': return 'h-12'; // Just the handle/header
          case 'half': return 'h-[45vh]';
          case 'full': return 'h-[90vh]';
      }
  };

  const handleToggleSheet = () => {
      if (mobileSheetState === 'collapsed') setMobileSheetState('half');
      else if (mobileSheetState === 'half') setMobileSheetState('full');
      else setMobileSheetState('collapsed');
  }

  return (
    <aside className={`
        bg-slate-800 text-slate-200 border-t md:border-t-0 md:border-r border-slate-700/80 shadow-2xl md:shadow-none
        transition-all duration-300 ease-in-out
        
        /* Mobile Styles (Bottom Sheet) */
        fixed bottom-0 left-0 w-full z-20 rounded-t-2xl
        ${getMobileHeightClass()}
        
        /* Desktop Styles (Sidebar) */
        md:relative md:h-full md:w-80 lg:w-96 md:rounded-none md:z-auto
        flex flex-col
    `}>
      
      {/* Mobile Drag Handle / Header */}
      <div 
        className="md:hidden flex flex-col items-center justify-center pt-2 pb-1 cursor-pointer bg-slate-800 rounded-t-2xl border-b border-slate-700/50"
        onClick={handleToggleSheet}
      >
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-slate-600 rounded-full mb-2"></div>
          {mobileSheetState === 'collapsed' && (
             <span className="text-xs font-semibold text-slate-400">Xem danh sách ({items.length})</span>
          )}
      </div>

      {/* Content Container - Hidden on collapsed mobile */}
      <div className={`flex-col h-full overflow-hidden ${mobileSheetState === 'collapsed' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Desktop Header - Hidden on Mobile since we have floating search */}
        <header className="hidden md:flex flex-col p-4 border-b border-slate-700 shrink-0">
            <h1 className="text-2xl font-bold text-sky-400">Bản đồ Lịch sử</h1>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Đà Nẵng</h2>
        </header>

        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 sticky top-0 bg-slate-800 z-10 py-1 flex items-center gap-2">
                {viewMode === 'sites' ? <LocationMarkerIcon className="h-4 w-4" /> : <UsersIcon className="h-4 w-4" />}
                {listTitle} ({items.length})
            </h3>
            
            {isLoading ? (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-slate-700 h-10 w-10"></div>
                        <div className="flex-1 space-y-3 py-1">
                            <div className="h-2 bg-slate-700 rounded"></div>
                            <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                        </div>
                    </div>
                ))}
            </div>
            ) : (
            items.length > 0 ? (
                <ul className="space-y-1 pb-20 md:pb-0">
                {items.map(item => {
                    const isSelected = isItemSelected(item);
                    const isSite = 'site_id' in item;
                    const key = isSite ? `site-${item.site_id}` : `person-${item.person_id}`;
                    const name = isSite ? (item as Site).site_name : (item as Person).full_name;
                    const description = isSite 
                        ? (item as Site).site_type 
                        : `${(item as Person).birth_year || '?'} - ${(item as Person).death_year || '?'}`;
                    
                    return (
                    <li key={key} 
                        onClick={() => {
                            if (isSite) {
                                onSiteSelect(item as Site)
                            } else {
                                onPersonSelect(item as Person)
                            }
                            // On mobile, maybe minimize sheet after selection?
                            // But usually selecting triggers the Detail Sheet on top.
                        }}
                        className={`relative flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer group 
                            ${isSelected ? 'bg-sky-500/20 shadow-inner' : 'hover:bg-slate-700/50'}
                        `}>
                        
                        <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-700 text-sky-500 group-hover:bg-slate-600 group-hover:text-sky-400'}`}>
                             {isSite ? <LocationMarkerIcon className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0">
                            <p className={`font-medium truncate ${isSelected ? 'text-sky-300' : 'text-slate-200'} group-hover:text-white`}>{name}</p>
                            <p className="text-xs text-slate-400 capitalize truncate">{description}</p>
                        </div>
                    </li>
                    );
                })}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <p className="italic">Không tìm thấy kết quả nào.</p>
                </div>
            )
            )}
        </div>
        
        {/* Footer */}
        <footer className="hidden md:block text-center text-xs text-slate-600 p-4 border-t border-slate-700 flex-shrink-0">
            <p>&copy; {new Date().getFullYear()} Da Nang Map</p>
        </footer>
      </div>
    </aside>
  );
};
