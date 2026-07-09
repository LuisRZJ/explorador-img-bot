// api/_adapters/nekobot.js

async function fetchImage(category, nsfw = false) {
    // Nekobot no requiere flag nsfw explicita, la categoria lo define
    const url = `https://nekobot.xyz/api/image?type=${category}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Nekobot API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.message) {
        throw new Error("Respuesta inválida de Nekobot");
    }

    return {
        url: data.message,
        category: category,
        is_nsfw: nsfw,
        provider: 'nekobot',
        artist: {
            name: null,
            url: null
        }
    };
}

module.exports = { fetchImage };
