/**
 * Calls the SerpAPI to perform a web search.
 * @param {string} apiKey - The user's SerpAPI key.
 * @param {string} query - The search query.
 * @param {string} engine - The search engine to use (e.g., 'google', 'bing').
 * @returns {Promise<object>} - A promise that resolves to the search results JSON object.
 */
async function callSerpApi(apiKey, query, engine) {
    const url = `https://serpapi.com/search.json`;

    const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        engine: engine
    });

    try {
        const response = await fetch(`${url}?${params}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('SerpAPI Error:', error);
        throw error;
    }
}
