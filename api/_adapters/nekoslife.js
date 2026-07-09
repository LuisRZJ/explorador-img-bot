// api/_adapters/nekoslife.js


async function fetchImage(category, nsfw = false) {
    if (nsfw) {
        throw new Error("Nekos.life no soporta contenido NSFW.");
    }
    
    const url = `https://nekos.life/api/v2/img/${category}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (contact: luisrzj.dev)'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Nekos.life API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.url) {
        throw new Error("Respuesta inválida de Nekos.life");
    }

    return {
        url: data.url,
        category: category,
        is_nsfw: false,
        provider: 'nekos.life',
        artist: {
            name: null,
            url: null
        }
    };
}

module.exports = { fetchImage };
