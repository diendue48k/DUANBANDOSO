
import { Site, SiteDetail, Person, PersonDetail, RouteData, AddressSearchResult, Event, Media } from '../types';

const API_BASE_URL = 'https://web-production-c3ccb.up.railway.app';
const PROXY_LIST = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
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

// Reference Data Store (Loaded once to avoid repeated large fetches)
interface ReferenceData {
    mediaMap: Map<string, RawDimMedia>;
    eventMediaRelations: RawFactEventMedia[];
    personEventRelations: RawFactPersonEvent[];
    personMap: Map<string, RawDimPerson>;
    isLoaded: boolean;
}

const refData: ReferenceData = {
    mediaMap: new Map(),
    eventMediaRelations: [],
    personEventRelations: [],
    personMap: new Map(),
    isLoaded: false
};


// --- Helpers ---

const MAX_RETRIES = 1; 
const INITIAL_BACKOFF = 1000;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    let attempt = 0;
    while (attempt <= retries) {
        attempt++;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); 

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // 404 is valid for "No Data Found" (e.g. no events for a location)
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
    
    // 1. Try Direct Fetch
    try {
        return await fetchWithRetry(directUrl);
    } catch (directError) {
        if (!options?.silent) {
            console.warn(`[API] Direct fetch failed for ${endpoint}, switching to proxies...`);
        }
        
        // 2. Try Proxies sequentially
        for (const createProxyUrl of PROXY_LIST) {
            try {
                const proxyUrl = createProxyUrl(directUrl);
                const proxyUrlWithCacheBust = `${proxyUrl}${proxyUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                return await fetchWithRetry(proxyUrlWithCacheBust);
            } catch (proxyError) {
                // Continue
            }
        }

        if (!options?.silent) {
            console.warn(`[API] All fetch attempts failed for ${endpoint}`);
        }
        return { count: 0, data: [] };
    }
}

const extractData = <T>(response: any): T[] => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    return [];
};

// --- Reference Data Loader ---

const ensureReferenceDataLoaded = async () => {
    if (refData.isLoaded) return;

    console.log("[RefData] Starting load of reference data...");

    // Fetch in parallel but handle failures individually so one failure doesn't block others
    const results = await Promise.allSettled([
        fetchFromApi('/media'),            
        fetchFromApi('/event-media'),      
        fetchFromApi('/person-events'),    
        fetchFromApi('/persons')           
    ]);

    const [mediaRes, eventMediaRes, personEventRes, personsRes] = results;

    // Process Media
    if (mediaRes.status === 'fulfilled') {
        const allMedia = extractData<RawDimMedia>(mediaRes.value);
        refData.mediaMap = new Map(allMedia.map(m => [String(m.media_key).trim(), m]));
        console.log(`[RefData] Loaded ${allMedia.length} media items.`);
    } else {
        console.error("[RefData] Failed to load Media:", mediaRes.reason);
    }

    // Process Event-Media Relations
    if (eventMediaRes.status === 'fulfilled') {
        const allEventMedia = extractData<RawFactEventMedia>(eventMediaRes.value);
        refData.eventMediaRelations = allEventMedia;
        console.log(`[RefData] Loaded ${allEventMedia.length} event-media links.`);
    } else {
        console.error("[RefData] Failed to load Event-Media relations:", eventMediaRes.reason);
    }

    // Process Person-Event Relations
    if (personEventRes.status === 'fulfilled') {
        const allPersonEvents = extractData<RawFactPersonEvent>(personEventRes.value);
        refData.personEventRelations = allPersonEvents;
        console.log(`[RefData] Loaded ${allPersonEvents.length} person-event links.`);
    } else {
        console.error("[RefData] Failed to load Person-Event relations:", personEventRes.reason);
    }

    // Process Persons
    if (personsRes.status === 'fulfilled') {
        const allPersons = extractData<RawDimPerson>(personsRes.value);
        refData.personMap = new Map(allPersons.map(p => [String(p.person_key).trim(), p]));
        console.log(`[RefData] Loaded ${allPersons.length} persons.`);
    } else {
         console.error("[RefData] Failed to load Persons:", personsRes.reason);
    }

    // Mark as loaded if we got at least *some* data, otherwise we might retry next time
    if (refData.mediaMap.size > 0 || refData.eventMediaRelations.length > 0) {
        refData.isLoaded = true;
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

    try {
        const [locationsResponse, citiesResponse] = await Promise.all([
            fetchFromApi('/locations'),
            fetchFromApi('/cities')
        ]);

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

        const citiesData = extractData<RawCity>(citiesResponse);
        if (citiesData.length > 0) {
            for (const item of citiesData) {
                if (!seenIds.has(String(item.city_id))) {
                    const citySite = mapSite(item);
                    if (citySite.latitude && citySite.longitude) {
                        mappedSites.push(citySite);
                    }
                }
            }
        }
        
        globalSiteCache = mappedSites;
        return mappedSites;

    } catch (e) {
        console.error("Error in fetchSites:", e);
        return [];
    }
};

export const fetchPersons = async (): Promise<Person[]> => {
    try {
        const response = await fetchFromApi('/persons');
        const data = extractData<RawDimPerson>(response);
        const mapped = data.map(mapPerson);
        globalPersonCache = mapped;
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
        // 2. Fetch specific events for this site from the backend
        // Your API has /events/location/{id} which filters efficiently on the server
        const eventsRes = await fetchFromApi(`/events/location/${siteId}`, { silent: true });
        const siteEventsRaw = extractData<RawFactEvent>(eventsRes);

        // 3. Ensure reference data (Media, Persons) is loaded for joining
        await ensureReferenceDataLoaded();

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
