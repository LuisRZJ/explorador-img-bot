// api/_adapters/e621.js

async function fetchImage(category, nsfw = false) {
    // Para llamar a la API local de rust e621, usamos el VERCEL_URL.
    // Si no estamos en vercel (ej dev local sin variables seteadas), fallback a localhost:3000
    const host = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
        
    const url = `${host}/api/e621?tags=${encodeURIComponent(category)}&nsfw=${nsfw}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`E621 Proxy error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.url) {
        throw new Error("No se encontró imagen válida desde el proxy E621");
    }

    return {
        url: data.url,
        category: category, // En este caso category es un tag de e621
        is_nsfw: nsfw,
        provider: 'e621',
        artist: {
            name: data.artist || null,
            url: data.artist_url || null
        }
    };
}

module.exports = { fetchImage };
