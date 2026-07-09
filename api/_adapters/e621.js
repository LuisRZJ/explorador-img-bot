// api/_adapters/e621.js

async function fetchImage(category, nsfw = false) {
    const domain = nsfw ? 'e621.net' : 'e926.net';
    
    // Decodificar espacios y armar los tags
    const cleanCategory = category.trim().replace(/%20/g, ' ').replace(/\+/g, ' ');
    const searchTags = nsfw ? cleanCategory : `${cleanCategory} rating:safe`;
    
    const encodedTags = encodeURIComponent(searchTags);
    const url = `https://${domain}/posts.json?tags=${encodedTags}&limit=50`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NekoExplorer/2.0 (by LuisRZJ on e621; contact: luisrzj.dev)',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`e621 API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.posts || !Array.isArray(data.posts) || data.posts.length === 0) {
        throw new Error("No se encontraron imágenes para esta categoría.");
    }
    
    // Filtrar posts con imagen de tipo jpg/png/gif y URL válida
    const validPosts = data.posts.filter(p => {
        const file = p.file;
        if (!file || !file.url || !file.ext) return false;
        return ['jpg', 'png', 'gif'].includes(file.ext.toLowerCase());
    });
    
    if (validPosts.length === 0) {
        throw new Error("No se encontraron imágenes estáticas válidas (jpg/png/gif).");
    }
    
    // Seleccionar uno aleatorio
    const idx = Math.floor(Math.random() * validPosts.length);
    const post = validPosts[idx];
    
    let artistName = "Artista Desconocido";
    if (post.tags && Array.isArray(post.tags.artist) && post.tags.artist.length > 0) {
        artistName = post.tags.artist[0];
    }
    
    const artistUrl = `https://${domain}/posts?tags=${encodeURIComponent(artistName)}`;
    
    return {
        url: post.file.url,
        category: category,
        is_nsfw: nsfw,
        provider: 'e621',
        artist: {
            name: artistName,
            url: artistUrl
        }
    };
}

module.exports = { fetchImage };
