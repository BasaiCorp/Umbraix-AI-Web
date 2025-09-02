async function callSerpApi(query, apiKey) {
    const url = `https://cors-anywhere.herokuapp.com/https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&output=json&no_cache=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('SerpApi Error:', error);
        throw error;
    }
}
