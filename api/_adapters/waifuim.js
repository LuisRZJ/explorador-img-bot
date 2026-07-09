// api/_adapters/waifuim.js

async function fetchImage(category, nsfw = false) {
    const isNsfwParam = nsfw ? 'true' : 'false';
    const url = `https://api.waifu.im/search?included_tags=${category}&is_nsfw=${isNsfwParam}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (contact: luisrzj.dev)'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Waifu.im API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.images || data.images.length === 0) {
        // En V2 waifu.im retorna images en vez de items, pero aseguramos compatibilidad
        if (data.items && data.items.length > 0) {
            data.images = data.items;
        } else {
            throw new Error("No se encontraron ilustraciones en Waifu.im");
        }
    }

    const item = data.images[0];
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
