import { GoogleGenAI, Type } from '@google/genai';
import { SiteDetail, PersonDetail } from '../types';

let aiClient: GoogleGenAI | null = null;

// --- Caches for different data types ---
interface SiteAIData {
  summary: string;
  funFacts: string[];
}
const siteAIDataCache = new Map<string, Promise<SiteAIData>>();
const personSummaryCache = new Map<string, Promise<string>>();


// --- Request Queue Implementation ---
interface QueuedRequest {
  id: string;
  params: any; // This will be the GenerateContentRequest object
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  processResponse: (text: string) => any;
  fallback: any;
}

let isProcessing = false;
const requestQueue: QueuedRequest[] = [];
const THROTTLE_DELAY_MS = 1500; 
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 10000; 

const getAiClient = (): GoogleGenAI | null => {
    if (aiClient) return aiClient;
    if (process.env.API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return aiClient;
    }
    console.warn("Gemini API key not found. AI features will be disabled.");
    return null;
};

const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) {
        return;
    }
    isProcessing = true;

    const request = requestQueue.shift()!;
    const ai = getAiClient();

    if (!ai) {
        console.error("Gemini client not available for queued request, returning fallback.");
        request.resolve(request.fallback);
        isProcessing = false;
        if (requestQueue.length > 0) processQueue();
        return;
    }

    let attempt = 0;
    let lastError: any = null;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                ...request.params,
            });
            const processedResult = request.processResponse(response.text);
            request.resolve(processedResult);
            lastError = null; // Success
            break;
        } catch (error) {
            lastError = error;
            const errorMessage = JSON.stringify(error) || '';

            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    console.error(`Max retries reached for rate-limited request ${request.id}.`);
                    break;
                }
                const delayMs = (INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)) + (Math.random() * 1000);
                console.warn(`Rate limit hit for ${request.id}. Retrying in ${Math.round(delayMs / 1000)}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                console.error(`Non-retryable error processing request ${request.id}:`, error);
                break;
            }
        }
    }

    if (lastError) {
        console.error(`Request ${request.id} failed in queue, returning fallback.`, lastError);
        request.resolve(request.fallback);
    }
    
    setTimeout(() => {
        isProcessing = false;
        processQueue();
    }, THROTTLE_DELAY_MS);
};

const addToQueue = <T>(
    id: string,
    cache: Map<string, Promise<T>>,
    params: any,
    processResponse: (text: string) => T,
    fallback: T,
): Promise<T> => {
    if (cache.has(id)) {
        return cache.get(id)!;
    }

    const newPromise = new Promise<T>((resolve, reject) => {
        requestQueue.push({ id, params, resolve, reject, processResponse, fallback });
        if (!isProcessing) {
            processQueue();
        }
    }).catch(err => {
        console.error(`Request ${id} failed in queue, returning fallback.`, err);
        cache.delete(id); // Allow retrying later
        return fallback;
    });
    
    cache.set(id, newPromise);
    return newPromise;
};


// --- Prompt Generation & Schemas ---
const siteResponseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: 'A concise and engaging summary of the historical site, under 70 words, in Vietnamese. Use markdown for bolding the site name, e.g. **Cầu Rồng**.'
        },
        funFacts: {
            type: Type.ARRAY,
            description: 'A list of 3 interesting, lesser-known fun facts about the site, in Vietnamese.',
            items: { type: Type.STRING }
        }
    },
    required: ['summary', 'funFacts']
};

const funFactsResponseSchema = {
    type: Type.OBJECT,
    properties: {
        funFacts: {
            type: Type.ARRAY,
            description: 'A list of 3 interesting, lesser-known fun facts about the site, in Vietnamese.',
            items: { type: Type.STRING }
        }
    },
    required: ['funFacts']
};

const generateSiteJsonPrompt = (site: SiteDetail): string => {
    const eventDetails = site.events?.map(e => `- ${e.event_name}: ${e.description}`).join('\n');
    return `Provide a structured JSON response about the historical site "${site.site_name}" in Da Nang, Vietnam.
The site is a ${site.site_type}.
Key information includes:
${eventDetails}

The JSON object must conform to the provided schema.
- The 'summary' should be a concise, engaging overview for tourists, under 70 words, in Vietnamese. Use markdown for bolding the site name.
- The 'funFacts' should be an array of 3 interesting, lesser-known facts about the site, in Vietnamese.`;
};

const generateSiteFunFactsJsonPrompt = (site: SiteDetail): string => {
    const eventDetails = site.events?.map(e => `- ${e.event_name}: ${e.description}`).join('\n');
    return `Provide a structured JSON response about the historical site "${site.site_name}" in Da Nang, Vietnam.
The site is a ${site.site_type}.
Key information includes:
${eventDetails}

The JSON object must conform to the provided schema.
- The 'funFacts' should be an array of 3 interesting, lesser-known facts about the site. Do not include the site name in the facts. Write in Vietnamese.`;
};

const generatePersonPrompt = (data: { name: string, birth_year?: number, death_year?: number, biography: string }): string => {
    return `Hãy viết một đoạn tóm tắt tiểu sử ngắn gọn, hấp dẫn về nhân vật lịch sử "${data.name}" (${data.birth_year} - ${data.death_year}). Dựa trên thông tin sau: "${data.biography}". Hãy viết bằng tiếng Việt, dưới 80 từ, với văn phong trang trọng, phù hợp cho một ứng dụng giáo dục lịch sử.`;
};


// --- Public API Functions ---
export const getSiteAIData = (site: SiteDetail): Promise<SiteAIData> => {
    const id = `sitedata-${site.site_id}`;

    if (site.description) {
        // Has custom description, only fetch fun facts
        const prompt = generateSiteFunFactsJsonPrompt(site);
        const params = {
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: funFactsResponseSchema,
            },
        };
        const processResponse = (text: string): SiteAIData => {
            try {
                const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();
                const parsed = JSON.parse(cleanedText) as { funFacts: string[] };
                return { summary: site.description!, funFacts: parsed.funFacts || [] };
            } catch (e) {
                console.error("Failed to parse AI JSON response for fun facts:", text, e);
                return { summary: site.description!, funFacts: [] };
            }
        };
        const fallback: SiteAIData = { summary: site.description, funFacts: [] };

        return addToQueue<SiteAIData>(id, siteAIDataCache, params, processResponse, fallback);

    } else {
        // No custom description, fetch both
        const prompt = generateSiteJsonPrompt(site);
        const params = {
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: siteResponseSchema,
            },
        };
        const processResponse = (text: string): SiteAIData => {
            try {
                const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();
                return JSON.parse(cleanedText);
            } catch (e) {
                console.error("Failed to parse AI JSON response for site:", text, e);
                return fallback;
            }
        };
        const fallback: SiteAIData = {
            summary: site.events?.[0]?.description || 'Không có mô tả chi tiết.',
            funFacts: [],
        };

        return addToQueue<SiteAIData>(id, siteAIDataCache, params, processResponse, fallback);
    }
};

export const getPersonSummary = (id: string, promptData: { name: string, birth_year?: number, death_year?: number, biography: string }): Promise<string> => {
    const cacheKey = `person-${id}`;
    const prompt = generatePersonPrompt(promptData);
    const fallback = promptData.biography || 'Không có tiểu sử chi tiết.';
    return addToQueue<string>(cacheKey, personSummaryCache, { contents: prompt }, (text) => text, fallback);
};