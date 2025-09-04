// openrouter.js

/**
 * Fetches the list of available models from the OpenRouter API.
 * @param {string} apiKey - The user's OpenRouter API key.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of model objects.
 */
async function fetchOpenRouterModels(apiKey) {
    if (!apiKey) {
        console.warn('OpenRouter API key is not set. Skipping model fetch.');
        return [];
    }

    const url = 'https://openrouter.ai/api/v1/models';
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data; // The models are in the 'data' property
    } catch (error) {
        console.error('Error fetching OpenRouter models:', error);
        // Return an empty array or handle the error as needed in the UI
        return [];
    }
}

/**
 * Sends a chat completion request to the OpenRouter API.
 * @param {string} apiKey - The user's OpenRouter API key.
 * @param {string} model - The name of the model to use.
 * @param {Array<object>} messages - The conversation history.
 * @returns {Promise<string>} - A promise that resolves to the AI's response text.
 */
async function callOpenRouterAPI(apiKey, model, messages, onChunk, onComplete, signal, options = {}) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const requestBody = {
        model: model,
        messages: messages,
        stream: true
    };

    if (options.isImageGen) {
        requestBody.modalities = ["image", "text"];
    }

    const body = JSON.stringify(requestBody);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://umbraix.com', // Replace with your actual site URL
                'X-Title': 'Umbraix AI', // Replace with your actual app name
            },
            body: body,
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
            if (signal.aborted) {
                reader.cancel();
                break;
            }
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') {
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.choices && parsed.choices[0].delta) {
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                const text = delta.content;
                                fullResponse += text;
                                onChunk(text);
                            }
                            if (delta.images) {
                                for (const image of delta.images) {
                                    onChunk(image.image_url.url);
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }
        }
        onComplete(fullResponse);
    } catch (error) {
        console.error('OpenRouter API Error:', error);
        throw error;
    }
}

/**
 * Calls the Google Custom Search API.
 * @param {string} query - The search query.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of search result items.
 */
async function callGoogleSearchApi(query) {
    // Note: GOOGLE_API_KEY and GOOGLE_CSE_ID are defined in the main script in index.html
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
        throw new Error("Google API Key or CSE ID is not set. Please configure them in the settings.");
    }

    // Quota management for default key
    if (GOOGLE_API_KEY === 'AIzaSyBy6hIfvcKPvxsXw10ZQQ7NZPiQB-RgjuM') {
        const today = new Date().toISOString().split('T')[0];
        let quota = JSON.parse(localStorage.getItem('google_search_quota') || '{}');

        if (quota.date !== today) {
            quota = { date: today, count: 0 };
        }

        if (quota.count >= 100) {
            throw new Error("Default search quota exceeded for today. Please add your own API key in the settings to continue using web search.");
        }

        quota.count++;
        localStorage.setItem('google_search_quota', JSON.stringify(quota));
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=10`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error?.message || `HTTP error! status: ${response.status}`;
            console.error('Google Custom Search API Error:', errorMessage);
            if (errorMessage.includes('quotaExceeded') || (data.error && data.error.code === 429)) {
                throw new Error("The daily search quota has been exceeded. Please try again tomorrow or use your own API key.");
            }
            throw new Error(errorMessage);
        }

        return data.items || [];
    } catch (error) {
        console.error('Google Custom Search API Error:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}
