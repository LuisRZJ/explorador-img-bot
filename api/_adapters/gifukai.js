// api/_adapters/gifukai.js

async function fetchImage(category, nsfw = false, req = null) {
    if (nsfw) {
        throw new Error("Gifukai no contiene base de datos NSFW.");
    }
    
    // Capturar emparejamiento desde la query de la petición si existe
    const pairing = req && req.query && req.query.pairing;
    
    const params = new URLSearchParams();
    if (pairing) {
        params.set('pairing', pairing);
    }
    
    // Mapeo especial para categorías de NekoExplorer
    let searchCategory = category;
    if (category === 'fox_girl') {
        searchCategory = 'nya';
    } else if (category === 'neko') {
        searchCategory = 'nya';
    }
    
    const url = `https://api.gifukai.com/${searchCategory}?${params.toString()}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (contact: luisrzj.dev)',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Gifukai API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.url) {
        throw new Error("No se obtuvo URL de imagen válida desde Gifukai");
    }
    
    return {
        url: data.url,
        category: category,
        is_nsfw: nsfw,
        provider: 'gifukai',
        artist: {
            name: data.anime || 'Anime',
            url: null
        }
    };
}

module.exports = { fetchImage };
