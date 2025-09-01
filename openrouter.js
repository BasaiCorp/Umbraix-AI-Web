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
async function callOpenRouterAPI(apiKey, model, messages, onChunk, onComplete, signal) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const body = JSON.stringify({
        model: model,
        messages: messages,
        stream: true
    });

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
                        if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                            const text = parsed.choices[0].delta.content;
                            fullResponse += text;
                            onChunk(text);
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
