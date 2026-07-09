// api/_lib/registry.js

/**
 * Catálogo de Categorías
 * Define las categorías soportadas, si son NSFW, y los proveedores disponibles para cada una.
 */

const categories = {
    // ---- Reacciones / Acciones SFW ----
    hug: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    pat: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    kiss: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    slap: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    tickle: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    poke: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    feed: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    cuddle: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    smug: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    baka: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    
    // Nekos.life exclusives
    spank: { type: 'sfw', providers: ['nekos.life'] },
    
    // Nekos.best exclusives
    bite: { type: 'sfw', providers: ['nekos.best'] },
    blush: { type: 'sfw', providers: ['nekos.best'] },
    bored: { type: 'sfw', providers: ['nekos.best'] },
    cry: { type: 'sfw', providers: ['nekos.best'] },
    dance: { type: 'sfw', providers: ['nekos.best'] },
    facepalm: { type: 'sfw', providers: ['nekos.best'] },
    happy: { type: 'sfw', providers: ['nekos.best'] },
    highfive: { type: 'sfw', providers: ['nekos.best'] },
    laugh: { type: 'sfw', providers: ['nekos.best'] },
    nod: { type: 'sfw', providers: ['nekos.best'] },
    nom: { type: 'sfw', providers: ['nekos.best'] },
    nope: { type: 'sfw', providers: ['nekos.best'] },
    shrug: { type: 'sfw', providers: ['nekos.best'] },
    sleep: { type: 'sfw', providers: ['nekos.best'] },
    smile: { type: 'sfw', providers: ['nekos.best'] },
    stare: { type: 'sfw', providers: ['nekos.best'] },
    think: { type: 'sfw', providers: ['nekos.best'] },
    thumbsup: { type: 'sfw', providers: ['nekos.best'] },
    wave: { type: 'sfw', providers: ['nekos.best'] },
    wink: { type: 'sfw', providers: ['nekos.best'] },
    yeet: { type: 'sfw', providers: ['nekos.best'] },
    bonk: { type: 'sfw', providers: ['nekos.best'] },
    handhold: { type: 'sfw', providers: ['nekos.best'] },
    kick: { type: 'sfw', providers: ['nekos.best'] },
    punch: { type: 'sfw', providers: ['nekos.best'] },
    angry: { type: 'sfw', providers: ['nekos.best'] },
    blowkiss: { type: 'sfw', providers: ['nekos.best'] },
    pout: { type: 'sfw', providers: ['nekos.best'] },
    handshake: { type: 'sfw', providers: ['nekos.best'] },
    salute: { type: 'sfw', providers: ['nekos.best'] },

    // ---- Personajes / Solo Imágenes SFW ----
    neko: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'nekobot'] },
    fox_girl: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] }, // en nekos.best internamente es kitsune
    waifu: { type: 'sfw', providers: ['waifu.im'] },
    ngif: { type: 'sfw', providers: ['nekos.life'] },
    gecg: { type: 'sfw', providers: ['nekos.life'] },
    avatar: { type: 'sfw', providers: ['nekos.life'] },
    wallpaper: { type: 'sfw', providers: ['nekos.life'] },

    // Waifu.im exclusives (SFW)
    maid: { type: 'sfw', providers: ['waifu.im'] },
    "marin-kitagawa": { type: 'sfw', providers: ['waifu.im'] },
    "mori-calliope": { type: 'sfw', providers: ['waifu.im'] },
    "raiden-shogun": { type: 'sfw', providers: ['waifu.im'] },
    oppai: { type: 'sfw', providers: ['waifu.im'] },
    selfies: { type: 'sfw', providers: ['waifu.im'] },
    uniform: { type: 'sfw', providers: ['waifu.im'] },

    // Nekobot exclusives (SFW)
    holo: { type: 'sfw', providers: ['nekobot'] },
    kanna: { type: 'sfw', providers: ['nekobot'] },
    kemonomimi: { type: 'sfw', providers: ['nekobot'] },
    coffee: { type: 'sfw', providers: ['nekobot'] },
    food: { type: 'sfw', providers: ['nekobot'] },

    // ---- NSFW ----
    nsfw_waifu: { type: 'nsfw', providers: ['waifu.im'] },
    nsfw_neko: { type: 'nsfw', providers: ['nekobot'] },
    hentai: { type: 'nsfw', providers: ['nekobot'] },
    ass: { type: 'nsfw', providers: ['nekobot'] },
    pgif: { type: 'nsfw', providers: ['nekobot'] },
    thighs: { type: 'nsfw', providers: ['nekobot'] },
    paizuri: { type: 'nsfw', providers: ['nekobot'] },
    tentacle: { type: 'nsfw', providers: ['nekobot'] },
    boobs: { type: 'nsfw', providers: ['nekobot'] },
    yaoi: { type: 'nsfw', providers: ['nekobot'] }
};

module.exports = {
    categories,
    providers: ['nekos.life', 'nekos.best', 'waifu.im', 'nekobot', 'e621']
};
