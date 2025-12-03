import { Site, SiteDetail, Person, PersonDetail, RouteData, AddressSearchResult, Event, Media } from '../types';

const API_BASE_URL = 'https://web-production-c3ccb.up.railway.app';

// Order by typical speed/reliability: 
// 1. corsproxy.io (Direct pipe, usually fastest)
// 2. codetabs (Reliable)
// 3. allorigins (JSON wrapped, slower but very stable)
const PROXY_LIST = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
];

// --- Raw Database Interfaces (Matching model.py & API JSON) ---

interface RawDimLocation {
    location_key: string | number;
    location_id: string;
    location_name: string;
    location_description?: string;
    address?: string;
    location_type?: string;
    latitude?: number;
    longitude?: number;
    city_id?: number;
}

interface RawCity {
    city_id: number;
    city_name: string;
    lat: number;
    lng: number;
}

interface RawFactEvent {
    event_key: string | number;
    event_id: string;
    event_name: string;
    event_date?: string;
    description?: string;
    location_key?: string | number; 
    main_person_key?: string | number;
}

interface RawDimMedia {
    media_key: string | number;
    media_id: string;
    media: string; // URL
    media_type?: string;
}

interface RawFactEventMedia {
    media_key: string | number;
    event_key: string | number;
}

interface RawFactPersonEvent {
    person_key: string | number;
    event_key: string | number;
    role?: string;
}

interface RawDimPerson {
    person_key: string | number;
    person_id: string;
    person_name: string;
    birth_year?: string;
    death_year?: string;
    birthplace?: string;
    biography?: string;
}

// --- Global Cache ---
let globalSiteCache: Site[] = [];
let globalPersonCache: Person[] = [];

// Reference Data Store
interface ReferenceData {
    mediaMap: Map<string, RawDimMedia>;
    eventMediaRelations: RawFactEventMedia[];
    personEventRelations: RawFactPersonEvent[];
    personMap: Map<string, RawDimPerson>;
    isLoaded: boolean;
    isLoading: boolean;
}

const refData: ReferenceData = {
    mediaMap: new Map(),
    eventMediaRelations: [],
    personEventRelations: [],
    personMap: new Map(),
    isLoaded: false,
    isLoading: false
};

// --- Local Storage Cache Helpers ---
const CACHE_PREFIX = 'dn_history_map_';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const getLocalCache = <T>(key: string): T | null => {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        
        const { timestamp, data } = JSON.parse(item);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return data as T;
    } catch (e) {
        return null;
    }
};

const setLocalCache = (key: string, data: any) => {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (e) {
        // Quota exceeded or similar
        console.warn("Failed to save to local cache", e);
    }
};


// --- Helpers ---

const MAX_RETRIES = 1; 
const INITIAL_BACKOFF = 1000;

// Polyfill for Promise.any to avoid TS errors if lib is not es2021
const promiseAny = async <T>(promises: Promise<T>[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        let errors: any[] = [];
        let pending = promises.length;
        if (pending === 0) {
            reject(new Error("No promises to execute"));
            return;
        }
        
        promises.forEach(p => {
            Promise.resolve(p).then(resolve).catch(e => {
                errors.push(e);
                pending--;
                if (pending === 0) {
                    reject(new Error("All promises rejected")); 
                }
            });
        });
    });
};

async function fetchWithRetry(url: string, retries = MAX_RETRIES, timeoutMs = 15000): Promise<any> {
    let attempt = 0;
    while (attempt <= retries) {
        attempt++;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs); 

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) return { count: 0, data: [] };
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error: any) {
            if (attempt <= retries) {
                const delay = INITIAL_BACKOFF * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

async function fetchFromApi(endpoint: string, options?: { silent?: boolean }): Promise<any> {
    const directUrl = `${API_BASE_URL}${endpoint}`;
    
    // 1. Race: Try Direct vs All Proxies concurrently to see which one wins first
    // This is faster than trying them sequentially.
    
    const strategies = [
        () => fetchWithRetry(directUrl, 0, 8000), // Direct, short timeout
        ...PROXY_LIST.map(createUrl => () => {
            const url = createUrl(directUrl);
            // AllOrigins returns a wrapper { contents: "string_data", status: ... }
            if (url.includes('allorigins')) {
                return fetchWithRetry(url, 0, 20000).then(json => {
                    if (json && json.contents) {
                        try {
                            return JSON.parse(json.contents);
                        } catch {
                            return json.contents; // fallback if string
                        }
                    }
                    return json;
                });
            }
            return fetchWithRetry(url, 0, 20000);
        })
    ];

    try {
        // Use promiseAny to get the first successful response
        const result = await promiseAny(strategies.map(fn => fn()));
        return result;
    } catch (aggregateError) {
        if (!options?.silent) {
            console.warn(`[API] All fetch strategies failed for ${endpoint}`, aggregateError);
        }
        return { count: 0, data: [] };
    }
}

const extractData = <T>(response: any): T[] => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    // Handle AllOrigins wrapper if it leaked through or standard API response
    if (response.contents) {
         try {
             const inner = typeof response.contents === 'string' ? JSON.parse(response.contents) : response.contents;
             return extractData(inner);
         } catch { return []; }
    }
    if (response.data && Array.isArray(response.data)) return response.data;
    return [];
};

// --- Reference Data Loader ---

export const ensureReferenceDataLoaded = async () => {
    if (refData.isLoaded || refData.isLoading) return;
    refData.isLoading = true;

    console.log("[RefData] Starting background load of reference data...");

    try {
        // Fetch in parallel
        const [mediaRes, eventMediaRes, personEventRes, personsRes] = await Promise.all([
            fetchFromApi('/media', { silent: true }),            
            fetchFromApi('/event-media', { silent: true }),      
            fetchFromApi('/person-events', { silent: true }),    
            fetchFromApi('/persons', { silent: true })           
        ]);

        // Process Media
        const allMedia = extractData<RawDimMedia>(mediaRes);
        refData.mediaMap = new Map(allMedia.map(m => [String(m.media_key).trim(), m]));

        // Process Event-Media Relations
        refData.eventMediaRelations = extractData<RawFactEventMedia>(eventMediaRes);

        // Process Person-Event Relations
        refData.personEventRelations = extractData<RawFactPersonEvent>(personEventRes);

        // Process Persons (for mapping in events)
        const allPersons = extractData<RawDimPerson>(personsRes);
        refData.personMap = new Map(allPersons.map(p => [String(p.person_key).trim(), p]));

        refData.isLoaded = true;
        console.log("[RefData] Background load complete.");

    } catch (e) {
        console.error("[RefData] Background load failed (will retry on demand):", e);
    } finally {
        refData.isLoading = false;
    }
};

// --- Mappers ---

const mapSite = (item: RawDimLocation | RawCity): Site => {
    const isCity = (item as RawCity).city_name !== undefined;
    
    if (isCity) {
        const city = item as RawCity;
        return {
            site_id: city.city_id, 
            site_name: city.city_name,
            site_type: 'Thành phố',
            latitude: Number(city.lat) || 0,
            longitude: Number(city.lng) || 0,
            address: '',
            description: '',
            additional_info: { 'City ID': String(city.city_id) }
        };
    } else {
        const loc = item as RawDimLocation;
        return {
            site_id: loc.location_id || String(loc.location_key),
            site_name: loc.location_name || 'Không tên',
            site_type: loc.location_type || 'Di tích',
            latitude: Number(loc.latitude) || 0,
            longitude: Number(loc.longitude) || 0,
            address: loc.address || '',
            description: loc.location_description || '',
            additional_info: {
                'Key': String(loc.location_key),
                'City ID': String(loc.city_id || '')
            }
        };
    }
};

const mapPerson = (item: RawDimPerson): Person => {
    const parseYear = (val: any) => {
        if (!val) return undefined;
        const parsed = parseInt(String(val), 10);
        return isNaN(parsed) ? undefined : parsed;
    };

    return {
        person_id: item.person_id || String(item.person_key),
        full_name: item.person_name || 'Không tên',
        birth_year: parseYear(item.birth_year),
        death_year: parseYear(item.death_year)
    };
};

const hydrateEvents = (rawEvents: RawFactEvent[]): Event[] => {
    return rawEvents.map(evt => {
        const evtKeyStr = String(evt.event_key).trim();

        // 1. Join Media
        const relatedMediaKeys = refData.eventMediaRelations
            .filter(r => String(r.event_key).trim() === evtKeyStr)
            .map(r => String(r.media_key).trim());
        
        const eventMedia: Media[] = relatedMediaKeys
            .map(k => refData.mediaMap.get(k))
            .filter((m): m is RawDimMedia => !!m)
            .map(m => ({
                media_id: m.media_id,
                media_url: m.media, 
                media_type: (m.media_type === 'video' || m.media_type === 'youtube') ? 'video' : 'image',
                caption: '' 
            }));

        // 2. Join Persons
        const relatedPersonKeys = refData.personEventRelations
            .filter(r => String(r.event_key).trim() === evtKeyStr)
            .map(r => String(r.person_key).trim());

        const eventPersons: Person[] = relatedPersonKeys
            .map(k => refData.personMap.get(k))
            .filter((p): p is RawDimPerson => !!p)
            .map(mapPerson);

        return {
            event_id: evt.event_id || String(evt.event_key),
            event_name: evt.event_name,
            start_date: evt.event_date,
            description: evt.description || '',
            media: eventMedia,
            persons: eventPersons,
            related_site_id: evt.location_key ? String(evt.location_key) : undefined,
            related_site_name: '' 
        };
    });
};

// --- Data Fetching ---

export const fetchSites = async (): Promise<Site[]> => {
    const mappedSites: Site[] = [];
    const seenIds = new Set<string>();
    
    // 1. Try Local Cache First (Instant Load)
    const cachedSites = getLocalCache<Site[]>('sites');
    if (cachedSites) {
        console.log("[Cache] Loaded sites from local storage");
        globalSiteCache = cachedSites;
        // Background update check could go here, but for now we trust cache for speed
        // If no cache, we fetch.
        return cachedSites; 
    }

    try {
        const locationsResponse = await fetchFromApi('/locations');
        const locationsData = extractData<RawDimLocation>(locationsResponse);
        
        if (locationsData.length > 0) {
            for (const item of locationsData) {
                const site = mapSite(item);
                if (site.latitude && site.longitude) {
                    mappedSites.push(site);
                    seenIds.add(String(site.site_id));
                }
            }
        }
        
        if (mappedSites.length > 0) {
            globalSiteCache = mappedSites;
            setLocalCache('sites', mappedSites);
        }
        return mappedSites;

    } catch (e) {
        console.error("Error in fetchSites:", e);
        return [];
    }
};

export const fetchPersons = async (): Promise<Person[]> => {
    // 1. Try Local Cache First
    const cachedPersons = getLocalCache<Person[]>('persons');
    if (cachedPersons) {
        console.log("[Cache] Loaded persons from local storage");
        globalPersonCache = cachedPersons;
        return cachedPersons;
    }

    try {
        const response = await fetchFromApi('/persons');
        const data = extractData<RawDimPerson>(response);
        const mapped = data.map(mapPerson);
        
        if (mapped.length > 0) {
            globalPersonCache = mapped;
            setLocalCache('persons', mapped);
        }
        return mapped;
    } catch (e) {
        console.error("Error in fetchPersons:", e);
        return [];
    }
};

export const fetchSiteDetail = async (siteId: string | number): Promise<SiteDetail | null> => {
    // 1. Get Basic Site Info (from Cache or API)
    let siteInfo: Site | null = globalSiteCache.find(s => String(s.site_id) === String(siteId)) || null;
    
    if (!siteInfo) {
        const res = await fetchFromApi(`/locations/${siteId}`);
        const data = extractData<RawDimLocation>(res);
        if (data.length > 0) siteInfo = mapSite(data[0]);
    }
    
    if (!siteInfo) return null;

    try {
        // 2. Start fetching events
        const eventsPromise = fetchFromApi(`/events/location/${siteId}`, { silent: true });
        
        // 3. Ensure reference data is loaded (might already be running in bg)
        const refPromise = ensureReferenceDataLoaded();

        const [eventsRes] = await Promise.all([eventsPromise, refPromise]);
        
        const siteEventsRaw = extractData<RawFactEvent>(eventsRes);

        // 4. Hydrate events with client-side joins
        const hydratedEvents = hydrateEvents(siteEventsRaw);

        return {
            ...siteInfo,
            events: hydratedEvents
        };

    } catch (error) {
        console.error("Error fetching site details:", error);
        return { ...siteInfo, events: [] };
    }
};

export const fetchPersonDetail = async (personId: string | number): Promise<PersonDetail | null> => {
    const res = await fetchFromApi(`/persons/${personId}`);
    const data = extractData<RawDimPerson>(res);
    if (data.length === 0) return null;
    
    const rawPerson = data[0];
    const personInfo = mapPerson(rawPerson);
    const dbKey = String(rawPerson.person_key).trim();

    try {
        await ensureReferenceDataLoaded();

        // Find event keys linked to this person
        const linkedEventKeys = new Set(
            refData.personEventRelations
                .filter(r => String(r.person_key).trim() === dbKey)
                .map(r => String(r.event_key).trim())
        );

        if (linkedEventKeys.size === 0) {
             return { ...personInfo, biography: rawPerson.biography || '', events: [], media: [] };
        }

        // Fetch all events (fallback since we can't filter events by person on backend easily)
        const eventsRes = await fetchFromApi('/events');
        const allEvents = extractData<RawFactEvent>(eventsRes);
        
        const personEventsRaw = allEvents.filter(e => linkedEventKeys.has(String(e.event_key).trim()));
        const hydratedEvents = hydrateEvents(personEventsRaw);
        
        // Aggregate media
        const personMedia: Media[] = [];
        hydratedEvents.forEach(e => {
            if (e.media) personMedia.push(...e.media);
        });

        return {
            ...personInfo,
            biography: rawPerson.biography || '',
            events: hydratedEvents,
            media: personMedia
        };

    } catch (error) {
        console.error("Error fetching person details:", error);
        return { ...personInfo, biography: rawPerson.biography || '', events: [], media: [] };
    }
};

// --- External Services ---

const formatDistance = (distanceMeters: number): string => {
    if (distanceMeters < 1) return '';
    if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)} km`;
    return `${Math.round(distanceMeters)} m`;
};

const getInstructionText = (maneuver: any, streetName: string): string => {
    const type = maneuver.type;
    const modifier = maneuver.modifier;
    let action = '';
    switch (type) {
        case 'depart': action = 'Khởi hành'; break;
        case 'arrive': return 'Bạn đã đến đích';
        case 'turn':
        case 'fork':
        case 'end of road':
             if (modifier && modifier.includes('left')) action = 'Rẽ trái';
             else if (modifier && modifier.includes('right')) action = 'Rẽ phải';
             else action = 'Rẽ';
             break;
        case 'roundabout': action = `Đi vào vòng xuyến (lối ra ${maneuver.exit || 1})`; break;
        default: action = 'Đi tiếp';
    }
    if (streetName) return `${action} vào ${streetName}`;
    return action;
};

export const fetchDirections = async (start: [number, number], end: [number, number]): Promise<RouteData> => {
    const [startLat, startLon] = start;
    const [endLat, endLon] = end;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?steps=true&geometries=geojson&overview=full`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`OSRM Status ${response.status}`);
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No route found');
        const route = data.routes[0];
        const leg = route.legs[0];
        return {
            summary: {
                totalDistance: formatDistance(route.distance),
                totalDuration: `${Math.round(route.duration / 60)} phút`
            },
            steps: leg.steps.map((step: any) => ({
                instruction: getInstructionText(step.maneuver, step.name),
                distance: formatDistance(step.distance)
            })),
            routeGeometry: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])
        };
    } catch (error) {
        return {
            summary: {
                totalDistance: formatDistance(getDistanceFromLatLonInKm(startLat, startLon, endLat, endLon) * 1000),
                totalDuration: "Đường chim bay"
            },
            steps: [{ instruction: "Chế độ offline: Đi thẳng đến đích", distance: "" }],
            routeGeometry: [[startLat, startLon], [endLat, endLon]]
        };
    }
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1); 
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
function deg2rad(deg: number) { return deg * (Math.PI/180) }

export const searchAddress = async (query: string): Promise<AddressSearchResult[]> => {
    if (!query || query.length < 3) return [];
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 4000);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`;
        const response = await fetch(url, { headers: { 'Accept-Language': 'vi' }, signal: controller.signal });
        if (!response.ok) throw new Error('Nominatim fetch failed');
        const data = await response.json();
        return data.map((item: any) => ({
            name: item.display_name.split(',')[0],
            address: item.display_name,
            coordinates: [parseFloat(item.lat), parseFloat(item.lon)]
        }));
    } catch (error) {
        return [];
    }
};

export const reverseGeocode = async (coords: [number, number]): Promise<string> => {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 4000);
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&zoom=18&addressdetails=1`;
        const response = await fetch(url, { headers: { 'Accept-Language': 'vi' }, signal: controller.signal });
        if (!response.ok) throw new Error('Nominatim reverse failed');
        const data = await response.json();
        return data.display_name ? data.display_name.split(',')[0] : "Vị trí đã chọn";
    } catch (error) {
        return `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
    }
};