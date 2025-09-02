// search.js

/**
 * Calls the Brave Search API.
 * @param {string} query - The search query.
 * @param {string} apiKey - The user's Brave Search API key.
 * @param {string} searchType - The type of search to perform (e.g., 'web', 'images', 'news').
 * @returns {Promise<object>} - A promise that resolves to the search results.
 */
async function callBraveSearchAPI(query, apiKey, searchType = 'web') {
    let endpoint;
    switch (searchType) {
        case 'images':
            endpoint = 'images/search';
            break;
        case 'news':
            endpoint = 'news/search';
            break;
        case 'web':
        default:
            endpoint = 'web/search';
            break;
    }

    const url = `https://api.search.brave.com/res/v1/${endpoint}?q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Brave Search API Error:', error);
        throw error;
    }
}
