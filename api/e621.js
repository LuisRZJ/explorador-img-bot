export default async function handler(req, res) {
    // Manejo de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { tags = '', nsfw = 'false' } = req.query;
        const isNsfw = nsfw === 'true';
        
        // Determinar el dominio basado en la bandera NSFW
        // e926.net es el mirror oficial SFW de e621.net
        const domain = isNsfw ? 'e621.net' : 'e926.net';
        
        // Construir la URL (limit=50 para tener variedad y elegir una aleatoria)
        const encodedTags = encodeURIComponent(tags + (isNsfw ? '' : ' rating:safe'));
        const url = `https://${domain}/posts.json?tags=${encodedTags}&limit=50`;

        // Petición a la API (el User-Agent es obligatorio para evitar bloqueos)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'NekoExplorer/1.0 (by LuisRZJ on e621)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error de ${domain}: ${response.status} ${errText}`);
        }

        const data = await response.json();
        
        if (!data.posts || data.posts.length === 0) {
            return res.status(404).json({ error: 'No se encontraron imágenes para esta categoría.' });
        }

        // Seleccionar una imagen aleatoria que tenga un archivo de imagen válido (filtrar webm/flash si es necesario)
        const validPosts = data.posts.filter(p => p.file && p.file.url && (p.file.ext === 'jpg' || p.file.ext === 'png' || p.file.ext === 'gif'));
        
        if (validPosts.length === 0) {
            return res.status(404).json({ error: 'No se encontraron imágenes válidas.' });
        }

        const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];
        
        // Extraer el nombre del artista (e621 tiene un array de artistas)
        const artist = randomPost.tags && randomPost.tags.artist && randomPost.tags.artist.length > 0 
            ? randomPost.tags.artist[0] 
            : 'Artista Desconocido';
            
        // Devolver en un formato estandarizado para nuestro frontend
        return res.status(200).json({
            url: randomPost.file.url,
            artist: artist,
            artist_url: `https://${domain}/posts?tags=${artist}`, // Búsqueda de posts de ese artista
            post_url: `https://${domain}/posts/${randomPost.id}`,
            source: isNsfw ? 'e621' : 'e926',
            color: '#152f56' // Color característico de e621
        });

    } catch (error) {
        console.error('Error en el proxy de e621:', error);
        return res.status(500).json({ error: error.message });
    }
}
