// api/_adapters/waifuim.js

async function fetchImage(category, nsfw = false) {
    // La API de waifu.im requiere parámetros en PascalCase y el path /images
    const isNsfwParam = nsfw ? 'True' : 'False';
    
    // Si la categoría es nsfw_waifu, consultamos 'waifu' o dejamos vacío para obtener cualquier imagen NSFW.
    let searchTag = category;
    if (category === 'nsfw_waifu') {
        searchTag = 'waifu';
    }
    
    const url = `https://api.waifu.im/images?IncludedTags=${encodeURIComponent(searchTag)}&IsNsfw=${isNsfwParam}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (contact: luisrzj.dev)',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Waifu.im API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Obtener la lista de imágenes (la API de waifu.im devuelve 'items' o 'images')
    const items = data.items || data.images;
    if (!items || items.length === 0) {
        throw new Error("No se encontraron ilustraciones en Waifu.im");
    }

    const item = items[0];
    let artistName = null;
    let artistUrl = null;

    if (item.artists && item.artists.length > 0) {
        const artist = item.artists[0];
        artistName = artist.name;
        artistUrl = artist.pixiv || artist.twitter || item.source || null;
    }

    return {
        url: item.url,
        category: category,
        is_nsfw: item.is_nsfw || nsfw,
        provider: 'waifu.im',
        artist: {
            name: artistName,
            url: artistUrl
        }
    };
}

module.exports = { fetchImage };
