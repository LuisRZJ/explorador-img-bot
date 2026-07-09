// api/_adapters/nekosbest.js

async function fetchImage(category, nsfw = false) {
    if (nsfw) {
        throw new Error("Nekos.best no soporta contenido NSFW.");
    }

    // Nekos.best usa 'kitsune' para 'fox_girl'
    const apiCategory = category === 'fox_girl' ? 'kitsune' : category;
    const url = `https://nekos.best/api/v2/${apiCategory}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (contact: luisrzj.dev)'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Nekos.best API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error("No se encontraron resultados en Nekos.best");
    }

    const result = data.results[0];

    return {
        url: result.url,
        category: category,
        is_nsfw: false,
        provider: 'nekos.best',
        artist: {
            name: result.artist_name || null,
            url: result.artist_href || null
        }
    };
}

module.exports = { fetchImage };
