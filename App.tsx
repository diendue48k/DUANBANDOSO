

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { SiteDetailModal } from './components/SiteDetailModal';
import { PersonDetailModal } from './components/PersonDetailModal';
import { Site, Person, ViewMode, RouteData } from './types';
import { fetchSites, fetchPersons, fetchDirections, reverseGeocode } from './services/apiService';
import { GlobalSearch, ViewModeToggle } from './components/GlobalSearch';
import { DirectionsPanel } from './components/DirectionsPanel';

const App: React.FC = () => {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [viewMode, setViewMode] = useState<ViewMode>('sites');
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [mobileSheetState, setMobileSheetState] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  
  // Directions State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isGettingDirections, setIsGettingDirections] = useState(false);
  const [isDirectionsMode, setIsDirectionsMode] = useState(false);
  
  const [initialDirectionDestination, setInitialDirectionDestination] = useState<{name: string, coords: [number, number]} | null>(null);
  
  // Map picking state for directions
  const [isPickingStartPoint, setIsPickingStartPoint] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [sites, persons] = await Promise.all([fetchSites(), fetchPersons()]);
      setAllSites(sites);
      setAllPersons(persons);
      setIsLoading(false);
    };
    loadData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (viewMode === 'sites') {
      return allSites.filter(site => {
        const matchesSearch = site.site_name.toLowerCase().includes(term);
        const matchesType = selectedType === 'all' || site.site_type === selectedType;
        return matchesSearch && matchesType;
      });
    } else {
       return allPersons.filter(person => 
          person.full_name.toLowerCase().includes(term)
       );
    }
  }, [allSites, allPersons, viewMode, searchTerm, selectedType]);

  const siteTypes = useMemo(() => {
    const types = new Set(allSites.map(s => s.site_type));
    return ['all', ...Array.from(types)];
  }, [allSites]);

  const handleSiteSelect = (site: Site | null) => {
    setSelectedSite(site);
    setSelectedPerson(null);
  };

  const handlePersonSelect = (person: Person) => {
    setSelectedPerson(person);
  };

  const handleCloseModals = () => {
      setSelectedSite(null);
      setSelectedPerson(null);
  };
  
  const handleGlobalSearchSelect = (item: Site | Person) => {
      if ('site_id' in item) {
          handleSiteSelect(item as Site);
          setViewMode('sites');
      } else {
          handlePersonSelect(item as Person);
          setViewMode('persons');
      }
  };

  const handleShowDirections = async (site: Site) => {
      // Close detail modal
      setSelectedSite(null);
      
      // Open directions mode
      setIsDirectionsMode(true);
      setInitialDirectionDestination({
          name: site.site_name,
          coords: [site.latitude, site.longitude]
      });
  };
  
  const handleClearDirections = () => {
      setRoute(null);
      setIsDirectionsMode(false);
      setInitialDirectionDestination(null);
      setIsPickingStartPoint(false);
  };

  const handleFindRoute = async (startCoords: [number, number], startName: string, endCoords: [number, number], endName: string) => {
      setIsPickingStartPoint(false);
      setIsGettingDirections(true);
      
      const routeData = await fetchDirections(startCoords, endCoords);
      setRoute(routeData);
      
      setIsGettingDirections(false);
  };
  
  // Handle picking a location from the map (passed to the active input in DirectionsPanel usually, 
  // but for simplicity, we map it to picking a Start point if that mode is active)
  const handlePickLocation = (coords: [number, number]) => {
      // In a more complex app, we'd need to know WHICH input triggered this.
      // For now, if map picking is active, we just reverse geocode and let the panel know via a shared state or 
      // by just filling the input. 
      // However, since the Panel holds the input state, we need a way to communicate back.
      // The simplest way for this demo is to handle picking purely for the "Start" point since that's the most common use case.
      
      reverseGeocode(coords).then(name => {
         // This logic would need refinement to update the specific input field in DirectionsPanel.
         // Given the structure, we might need to lift state up or use a context, 
         // but let's assume the user just wants to see the address for now or we rely on the panel's internal logic
         // if we were passing state down.
         // To make this work with the new Panel which manages its own inputs:
         alert(`Vị trí đã chọn: ${name}. Vui lòng nhập vào ô tìm kiếm.`); 
         setIsPickingStartPoint(false);
      });
  };

  const toggleMobileMenu = () => {
      setMobileSheetState(prev => prev === 'collapsed' ? 'half' : 'collapsed');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Sidebar - Hidden in Directions Mode on mobile to save space */}
      <div className={`${isDirectionsMode ? 'hidden md:block' : 'block'}`}>
        <Sidebar 
            items={filteredItems}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            listTitle={viewMode === 'sites' ? 'Danh sách địa điểm' : 'Danh sách nhân vật'}
            onSearch={setSearchTerm}
            onFilter={setSelectedType}
            siteTypes={siteTypes}
            selectedType={selectedType}
            isLoading={isLoading}
            onSiteSelect={handleSiteSelect}
            onPersonSelect={handlePersonSelect}
            selectedItem={selectedSite || selectedPerson}
            mobileSheetState={mobileSheetState}
            setMobileSheetState={setMobileSheetState}
        />
      </div>

      <main className="flex-grow relative h-full">
        {/* Search & Filter - Hide when in Directions Mode */}
        {!isDirectionsMode && (
            <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto z-30 flex flex-col md:flex-row gap-2 md:items-center pointer-events-none">
            <div className="w-full md:w-96 pointer-events-auto">
                <GlobalSearch 
                    allSites={allSites} 
                    allPersons={allPersons} 
                    viewMode={viewMode} 
                    onSelect={handleGlobalSearchSelect} 
                    onMenuClick={toggleMobileMenu}
                />
            </div>
            <div className="pointer-events-auto">
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
            </div>
        )}
        
        <MapView 
            sites={allSites}
            selectedSite={selectedSite}
            onSiteSelect={handleSiteSelect}
            onShowDetailModal={() => {}}
            isModalOpen={!!selectedSite || !!selectedPerson}
            route={route}
            userLocation={userLocation}
            onShowDirections={handleShowDirections}
            onClearDirections={handleClearDirections}
            isGettingDirections={isGettingDirections}
            isPickingStartPoint={isPickingStartPoint}
            onLocationPicked={handlePickLocation}
            onCancelPicking={() => setIsPickingStartPoint(false)}
            onMapClick={() => {
                if (window.innerWidth < 768 && mobileSheetState !== 'collapsed') {
                    setMobileSheetState('collapsed');
                }
            }}
        />

        {selectedSite && !isDirectionsMode && (
            <SiteDetailModal 
                site={selectedSite} 
                onClose={handleCloseModals} 
                onPersonSelect={handlePersonSelect}
                onShowDirections={handleShowDirections}
            />
        )}

        {selectedPerson && (
            <PersonDetailModal 
                person={selectedPerson} 
                onClose={handleCloseModals}
                onSiteSelect={(site) => {
                    handleSiteSelect(site);
                    setViewMode('sites');
                }}
                sites={allSites}
            />
        )}
        
        {isDirectionsMode && (
            <DirectionsPanel 
                routeData={route}
                onFindRoute={handleFindRoute}
                onCancel={handleClearDirections}
                initialDestination={initialDirectionDestination}
                userLocation={userLocation}
                isPickingStartPoint={isPickingStartPoint}
                onStartPickingLocation={() => setIsPickingStartPoint(true)}
            />
        )}
      </main>
    </div>
  );
};

export default App;
