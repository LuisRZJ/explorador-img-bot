// api/_adapters/e621.js

async function fetchImage(category, nsfw = false, req = null) {
    let host = 'localhost:3000';
    let protocol = 'http';
    
    // Resolver dinámicamente el host y protocolo de la petición entrante
    // Esto evita problemas con VERCEL_URL en vistas previas autenticadas o dominios personalizados.
    if (req && req.headers && req.headers.host) {
        host = req.headers.host;
        protocol = host.includes('localhost') ? 'http' : 'https';
    } else if (process.env.VERCEL_URL) {
        host = process.env.VERCEL_URL;
        protocol = 'https';
    }
    
    // Consultar al proxy de Rust en Vercel (/api/e621.rs)
    // El proxy de Rust utiliza reqwest con el User-Agent adecuado para evitar el bloqueo Cloudflare.
    const url = `${protocol}://${host}/api/e621?tags=${encodeURIComponent(category)}&nsfw=${nsfw}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`e621 proxy error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.url) {
        throw new Error("No se encontró imagen válida desde el proxy E621");
    }
    
    return {
        url: data.url,
        category: category,
        is_nsfw: nsfw,
        provider: 'e621',
        artist: {
            name: data.artist || "Artista Desconocido",
            url: data.artist_url || null
        }
    };
}

module.exports = { fetchImage };
