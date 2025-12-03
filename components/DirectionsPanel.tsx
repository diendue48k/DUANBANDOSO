
import React, { useState, useEffect, useRef } from 'react';
import { RouteData, AddressSearchResult } from '../types';
import { XIcon, LocationMarkerIcon, UserLocationIcon, SwapIcon, ArrowLeftIcon, ClockIcon } from './Icons';
import { searchAddress } from '../services/apiService';
import { useDebounce } from '../hooks/useDebounce';

interface LocationInputProps {
    value: string;
    onChange: (val: string) => void;
    onSelect: (result: AddressSearchResult) => void;
    placeholder: string;
    isUserLocationAllowed?: boolean;
    onSelectUserLocation?: () => void;
    autoFocus?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

const LocationInput: React.FC<LocationInputProps> = ({ 
    value, onChange, onSelect, placeholder, 
    isUserLocationAllowed, onSelectUserLocation, autoFocus, className, icon
}) => {
    const [results, setResults] = useState<AddressSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const debouncedQuery = useDebounce(value, 300);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isFocused || debouncedQuery.length < 3) {
            setResults([]);
            return;
        }

        const fetchAddresses = async () => {
            setIsLoading(true);
            try {
                const data = await searchAddress(debouncedQuery);
                setResults(data);
            } catch (err) {
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAddresses();
    }, [debouncedQuery, isFocused]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (result: AddressSearchResult) => {
        onSelect(result);
        setIsFocused(false);
    };

    return (
        <div className="relative w-full group" ref={containerRef}>
             <div className={`
                relative flex items-center bg-slate-800 rounded-xl border border-slate-700 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all
                ${className}
            `}>
                <div className="pl-3 pr-2 flex-shrink-0 flex items-center justify-center">
                    {icon}
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="w-full bg-transparent border-none py-3 px-0 text-slate-100 placeholder-slate-500 focus:ring-0 text-sm font-medium leading-relaxed"
                />
                {value && (
                    <button 
                        onClick={() => onChange('')}
                        className="p-2 mr-1 text-slate-500 hover:text-white rounded-full transition-colors focus:outline-none"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto ring-1 ring-black/50">
                    {isUserLocationAllowed && onSelectUserLocation && value.length < 3 && (
                        <button
                            onClick={() => {
                                onSelectUserLocation();
                                setIsFocused(false);
                            }}
                            className="w-full text-left flex items-center px-4 py-3 hover:bg-slate-700 text-sky-400 transition-colors border-b border-slate-700"
                        >
                            <UserLocationIcon className="h-5 w-5 mr-3" />
                            <span className="font-semibold text-sm">Vị trí của bạn</span>
                        </button>
                    )}
                    
                    {isLoading && <div className="p-4 text-sm text-slate-400 text-center italic">Đang tìm kiếm...</div>}
                    
                    {!isLoading && results.length === 0 && debouncedQuery.length >= 3 && (
                        <div className="p-4 text-sm text-slate-400 text-center italic">Không tìm thấy kết quả.</div>
                    )}

                    {results.map((result, idx) => (
                        <button
                            key={`${result.name}-${idx}`}
                            onClick={() => handleSelect(result)}
                            className="w-full text-left flex items-center px-4 py-3 hover:bg-slate-700 transition-colors group border-b border-slate-700/50 last:border-0"
                        >
                            <LocationMarkerIcon className="h-5 w-5 text-slate-500 group-hover:text-slate-400 mr-3 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="font-medium text-slate-200 text-sm truncate">{result.name}</div>
                                <div className="text-xs text-slate-500 truncate">{result.address}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface DirectionsPanelProps {
    routeData: RouteData | null;
    onFindRoute: (startCoords: [number, number], startName: string, endCoords: [number, number], endName: string) => void;
    onCancel: () => void;
    initialDestination?: { name: string, coords: [number, number] } | null;
    userLocation: [number, number] | null;
    isPickingStartPoint: boolean;
    onStartPickingLocation: () => void;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({ 
    routeData, onFindRoute, onCancel, initialDestination, userLocation, 
    isPickingStartPoint, onStartPickingLocation 
}) => {
    const [startName, setStartName] = useState('');
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
    const [endName, setEndName] = useState('');
    const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (initialDestination) {
            setEndName(initialDestination.name);
            setEndCoords(initialDestination.coords);
        }
        if (userLocation && !startCoords && !startName) {
            setStartName('Vị trí của bạn');
            setStartCoords(userLocation);
        }
    }, [initialDestination, userLocation]);

    useEffect(() => {
        if (startCoords && endCoords && startName && endName) {
            onFindRoute(startCoords, startName, endCoords, endName);
        }
    }, [startCoords, endCoords]);

    const handleSwap = () => {
        setStartName(endName);
        setStartCoords(endCoords);
        setEndName(startName);
        setEndCoords(startCoords);
    };

    return (
        <div className="absolute top-0 left-0 h-full w-full md:w-[450px] z-[1000] flex flex-col bg-slate-900 shadow-2xl border-r border-slate-800">
            
            {/* Header - Solid Background */}
            <div className="bg-slate-900 z-20 px-4 py-4 flex items-center gap-3 shrink-0 border-b border-slate-800">
                <button 
                    onClick={onCancel} 
                    className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                    title="Đóng"
                >
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-white tracking-tight">Chỉ đường</h2>
            </div>

            {/* Inputs Area - Solid Background */}
            <div className="p-5 bg-slate-900 z-10 shrink-0 border-b border-slate-800 shadow-md relative">
                <div className="flex gap-4 relative items-start">
                     {/* Connector Graphics */}
                    <div className="flex flex-col items-center pt-3.5 w-6 flex-shrink-0 pointer-events-none">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-transparent"></div>
                        <div className="flex-grow w-0.5 border-l-2 border-dashed border-slate-600 my-1 min-h-[40px]"></div>
                        <div className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                    </div>

                    {/* Inputs */}
                    <div className="flex-grow flex flex-col gap-3">
                         <LocationInput
                            value={startName}
                            onChange={(val) => { setStartName(val); if (!val) setStartCoords(null); }}
                            onSelect={(res) => { setStartName(res.name); setStartCoords(res.coordinates); }}
                            placeholder="Chọn điểm đi"
                            isUserLocationAllowed={!!userLocation}
                            onSelectUserLocation={() => { setStartName('Vị trí của bạn'); setStartCoords(userLocation); }}
                            autoFocus={!startCoords}
                            icon={<div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>}
                        />
                        <LocationInput
                            value={endName}
                            onChange={(val) => { setEndName(val); if (!val) setEndCoords(null); }}
                            onSelect={(res) => { setEndName(res.name); setEndCoords(res.coordinates); }}
                            placeholder="Chọn điểm đến"
                            icon={<LocationMarkerIcon className="h-4 w-4 text-sky-500" />}
                        />
                    </div>

                     {/* Swap Button */}
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-3">
                        <button 
                            onClick={handleSwap}
                            className="p-2.5 bg-slate-800 border border-slate-600 text-sky-400 hover:text-white hover:border-sky-500 rounded-full transition-all shadow-xl hover:shadow-sky-500/20 active:scale-95 focus:outline-none"
                            title="Đổi chiều"
                        >
                            <SwapIcon className="h-5 w-5 rotate-90" />
                        </button>
                     </div>
                </div>
            </div>

            {/* Content Area - Solid Dark Background for Contrast */}
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-950 relative">
                {!routeData ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-6 p-6">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-2 border border-slate-800 shadow-inner">
                            <LocationMarkerIcon className="h-10 w-10 text-slate-700" />
                        </div>
                        <p className="text-center text-slate-400 max-w-xs font-medium">
                            Chọn điểm đi và điểm đến để xem lộ trình tối ưu nhất.
                        </p>
                        
                        <button 
                            onClick={onStartPickingLocation}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border transition-all shadow-lg
                                ${isPickingStartPoint 
                                    ? 'bg-sky-600 text-white border-sky-500 ring-4 ring-sky-500/20'
                                    : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:text-white'}
                            `}
                        >
                            <LocationMarkerIcon className="h-5 w-5" />
                            {isPickingStartPoint ? 'Đang chọn trên bản đồ...' : 'Chọn điểm trên bản đồ'}
                        </button>
                    </div>
                ) : (
                    <div className="p-5 pb-20">
                        {/* Summary Card - High Contrast */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 mb-8 border border-slate-700 shadow-lg relative overflow-hidden group">
                            {/* Decorative Icon Background */}
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ClockIcon className="w-24 h-24 text-sky-500 transform rotate-12 translate-x-8 -translate-y-8" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-900/50 px-2 py-1 rounded border border-sky-900/50">Tổng quan</span>
                                </div>
                                <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-5xl font-black text-white tracking-tighter drop-shadow-sm">
                                        {routeData.summary.totalDistance}
                                    </span>
                                </div>
                                <div className="flex items-center text-slate-400 font-medium text-lg">
                                     <ClockIcon className="h-5 w-5 mr-2 text-sky-500" />
                                     {routeData.summary.totalDuration}
                                </div>
                            </div>
                        </div>

                        {/* Steps List */}
                        <div className="space-y-0 relative ml-3">
                             {/* Line connecting steps */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-800 z-0"></div>

                            {routeData.steps.map((step, index) => (
                                <div key={index} className="relative pl-12 py-3 group first:pt-0">
                                    {/* Step Dot */}
                                    <div className="absolute left-[9px] top-5 w-3.5 h-3.5 rounded-full bg-slate-900 border-[3px] border-slate-600 group-hover:border-sky-500 transition-colors z-10 shadow-sm"></div>
                                    
                                    <div className="bg-slate-900 hover:bg-slate-800 rounded-xl p-4 transition-all border border-slate-800 hover:border-slate-600 shadow-sm">
                                        <p className="text-base font-medium text-slate-200 leading-snug mb-2" dangerouslySetInnerHTML={{ __html: step.instruction }}></p>
                                        <p className="text-xs text-slate-500 font-mono font-bold">{step.distance}</p>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Destination Marker */}
                            <div className="relative pl-12 pt-6">
                                <div className="absolute left-[5px] top-6 z-10">
                                     <LocationMarkerIcon className="h-6 w-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-lg font-bold text-white leading-tight">Đến nơi</p>
                                    <p className="text-sm text-slate-400 mt-1 font-medium">{endName}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
