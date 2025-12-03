
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Site, RouteData } from '../types';
import { SiteDetailContent } from './SiteDetailContent';
import { XIcon, LocationMarkerIcon } from './Icons';

// --- Icon Creation & Fixes ---

// Fix for default marker icon issue when using bundlers like Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createMarkerIcon = (isSelected: boolean): L.DivIcon => {
  const markerHtml = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${isSelected ? '<div class="marker-pulsate" style="position: absolute; width: 32px; height: 32px; background-color: #38bdf8; border-radius: 50%;"></div>' : ''}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" style="position: relative; z-index: 1; width: 32px; height: 32px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
        <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>
    </div>
  `;
  return L.divIcon({
    html: markerHtml,
    className: '', // Important to have an empty class name
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userLocationIcon = L.divIcon({
    html: `<div class="user-location-marker"><div class="user-location-pulse"></div></div>`,
    className: '',
    iconSize: [24, 24],
});


// --- Child Components for Map Logic ---

const MapController: React.FC<{ selectedSite: Site | null; isModalOpen: boolean; }> = ({ selectedSite, isModalOpen }) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => clearTimeout(timer);
  }, [isModalOpen, map]);

  useEffect(() => {
    if (selectedSite) {
        const targetLatLng: L.LatLngTuple = [selectedSite.latitude, selectedSite.longitude];
        map.flyTo(targetLatLng, 15, { animate: true, duration: 1.0 });
    }
  }, [selectedSite, map]);

  return null;
};

interface SiteMarkerProps {
    site: Site;
    isSelected: boolean;
    onSiteSelect: (site: Site | null) => void;
    onShowDetailModal: () => void;
    onShowDirections: (site: Site) => void;
    defaultIcon: L.DivIcon;
    selectedIcon: L.DivIcon;
    autoPanPadding: L.Point;
}

const SiteMarker: React.FC<SiteMarkerProps> = ({ site, isSelected, onSiteSelect, onShowDetailModal, onShowDirections, defaultIcon, selectedIcon, autoPanPadding }) => {
    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {
        if (isSelected && markerRef.current) {
            markerRef.current.openPopup();
        }
    }, [isSelected]);

    const eventHandlers = useMemo(() => ({
        click: () => {
            onSiteSelect(site);
        },
    }), [onSiteSelect, site]);
    
    const popupEventHandlers = useMemo(() => ({
        remove: () => {
            onSiteSelect(null);
        }
    }), [onSiteSelect]);

    return (
        <Marker
            ref={markerRef}
            position={[site.latitude, site.longitude]}
            icon={isSelected ? selectedIcon : defaultIcon}
            eventHandlers={eventHandlers}
        >
            <Popup
                className="custom-popup"
                minWidth={256}
                eventHandlers={popupEventHandlers}
                autoPanPadding={autoPanPadding}
            >
                <div className="w-64">
                  <SiteDetailContent 
                    siteId={site.site_id} 
                    isModal={false} 
                    onShowDetailModal={onShowDetailModal} 
                    onShowDirections={() => onShowDirections(site)}
                  />
                </div>
            </Popup>
        </Marker>
    );
};

interface RouteLayerProps {
  routeGeometry: [number, number][];
  userLocation: [number, number];
}

const RouteLayer: React.FC<RouteLayerProps> = ({ routeGeometry, userLocation }) => {
    const map = useMap();

    useEffect(() => {
        if (routeGeometry && userLocation) {
            const bounds = L.latLngBounds(routeGeometry).extend(userLocation);
            map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
        }
    }, [routeGeometry, userLocation, map]);

    return (
        <>
            <Polyline positions={routeGeometry} color="#0ea5e9" weight={5} opacity={0.8} />
            <Marker position={userLocation} icon={userLocationIcon}>
                <Popup>Vị trí của bạn</Popup>
            </Marker>
        </>
    );
};

const MapClickHandler: React.FC<{ onLocationPicked: (coords: [number, number]) => void }> = ({ onLocationPicked }) => {
    useMapEvents({
        click(e) {
            onLocationPicked([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
};

const MapBackgroundClickHandler: React.FC<{ onMapClick?: () => void, isPicking: boolean }> = ({ onMapClick, isPicking }) => {
    useMapEvents({
        click(e) {
            if (!isPicking && onMapClick) {
                onMapClick();
            }
        },
    });
    return null;
};


// --- Main MapView Component ---

interface MapViewProps {
  sites: Site[];
  selectedSite: Site | null;
  onSiteSelect: (site: Site | null) => void;
  onShowDetailModal: () => void;
  isModalOpen: boolean;
  route: RouteData | null;
  userLocation: [number, number] | null;
  onShowDirections: (site: Site) => void;
  onClearDirections: () => void;
  isGettingDirections: boolean;
  isPickingStartPoint: boolean;
  onLocationPicked: (coords: [number, number]) => void;
  onCancelPicking: () => void;
  onMapClick?: () => void;
}

export const MapView: React.FC<MapViewProps> = (props) => {
  const { sites, selectedSite, onSiteSelect, onShowDetailModal, isModalOpen, route, userLocation, onShowDirections, onClearDirections, isGettingDirections, isPickingStartPoint, onLocationPicked, onCancelPicking, onMapClick } = props;
  const daNangCenter: [number, number] = [16.0544, 108.2022];
  const [autoPanPadding, setAutoPanPadding] = useState<L.Point>(L.point(0, 0));

  useEffect(() => {
    const calculatePadding = () => {
        const isMobile = window.innerWidth < 768;
        let top = 20;
        let left = 20;

        if (isMobile) {
            const mobileHeader = document.querySelector<HTMLElement>('header.md\\:hidden');
            top = (mobileHeader?.offsetHeight || 0) + 20;
        } else {
            const sidebar = document.querySelector<HTMLElement>('aside.md\\:relative');
            left = (sidebar?.offsetWidth || 0) + 20;
        }
        
        setAutoPanPadding(L.point(left, top));
    };
    
    const timer = setTimeout(calculatePadding, 100);
    window.addEventListener('resize', calculatePadding);
    
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', calculatePadding);
    };
  }, []);
  
  const defaultIcon = useMemo(() => createMarkerIcon(false), []);
  const selectedIcon = useMemo(() => createMarkerIcon(true), []);

  return (
    <div className="relative h-full w-full">
        <MapContainer center={daNangCenter} zoom={12} scrollWheelZoom={true} className={`h-full w-full z-10 ${isPickingStartPoint ? 'picking-location' : ''}`}>
            <MapController selectedSite={selectedSite} isModalOpen={isModalOpen} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {isPickingStartPoint ? (
                <MapClickHandler onLocationPicked={onLocationPicked} />
            ) : (
                <MapBackgroundClickHandler onMapClick={onMapClick} isPicking={false} />
            )}

            {!route && sites.map(site => (
                <SiteMarker 
                    key={site.site_id}
                    site={site}
                    isSelected={selectedSite?.site_id === site.site_id}
                    onSiteSelect={onSiteSelect}
                    onShowDetailModal={onShowDetailModal}
                    onShowDirections={onShowDirections}
                    defaultIcon={defaultIcon}
                    selectedIcon={selectedIcon}
                    autoPanPadding={autoPanPadding}
                />
            ))}
            {route && userLocation && <RouteLayer routeGeometry={route.routeGeometry} userLocation={userLocation} />}
        </MapContainer>
        
        {isPickingStartPoint && (
            <div className="absolute top-28 md:top-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md">
                <div className="bg-slate-800/80 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center justify-between gap-x-3">
                    <div className="flex items-center gap-x-3">
                        <LocationMarkerIcon className="h-6 w-6 text-sky-400 animate-pulse" />
                        <span className="font-semibold">Chọn một điểm trên bản đồ</span>
                    </div>
                    <button 
                        onClick={onCancelPicking} 
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        aria-label="Hủy chọn điểm"
                    >
                        <XIcon className="h-5 w-5" />
                    </button> 
                </div>
            </div>
        )}
        
        {isGettingDirections && (
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center">
                <div className="flex flex-col items-center text-white">
                    <svg className="animate-spin h-8 w-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 font-semibold">Đang lấy chỉ đường...</p>
                </div>
             </div>
        )}
    </div>
  );
};
