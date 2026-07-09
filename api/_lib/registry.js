// api/_lib/registry.js

/**
 * Catálogo de Categorías
 * Define las categorías soportadas, si son NSFW, y los proveedores disponibles para cada una.
 */

const categories = {
    // ---- Reacciones / Acciones SFW ----
    hug: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    pat: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    kiss: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    slap: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    tickle: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    poke: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    feed: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    cuddle: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    smug: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] },
    baka: { type: 'sfw', providers: ['nekos.life', 'nekos.best'] },
    
    // Nekos.life exclusives
    spank: { type: 'sfw', providers: ['nekos.life'] },
    
    // Nekos.best exclusives / Gifukai SFW
    bite: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    blush: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    bored: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    cry: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    dance: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    facepalm: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    happy: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    highfive: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    laugh: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    nod: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    nom: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    nope: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    shrug: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    sleep: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    smile: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    stare: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    think: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    thumbsup: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    wave: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    wink: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    yeet: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    bonk: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    handhold: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    kick: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    punch: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    angry: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    blowkiss: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    pout: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    handshake: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },
    salute: { type: 'sfw', providers: ['nekos.best', 'gifukai'] },

    // ---- Personajes / Solo Imágenes SFW ----
    neko: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'nekobot', 'gifukai'] },
    fox_girl: { type: 'sfw', providers: ['nekos.life', 'nekos.best', 'gifukai'] }, // en nekos.best internamente es kitsune
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
    "genshin-impact": { type: 'sfw', providers: ['waifu.im'] },
    rem: { type: 'sfw', providers: ['waifu.im'] },
    selfies: { type: 'sfw', providers: ['waifu.im'] },
    uniform: { type: 'sfw', providers: ['waifu.im'] },
    "kamisato-ayaka": { type: 'sfw', providers: ['waifu.im'] },
    "one-piece": { type: 'sfw', providers: ['waifu.im'] },
    nami: { type: 'sfw', providers: ['waifu.im'] },
    oppai: { type: 'sfw', providers: ['waifu.im'] },

    // Nekobot exclusives (SFW)
    holo: { type: 'sfw', providers: ['nekobot'] },
    kanna: { type: 'sfw', providers: ['nekobot'] },
    kemonomimi: { type: 'sfw', providers: ['nekobot'] },
    coffee: { type: 'sfw', providers: ['nekobot'] },
    food: { type: 'sfw', providers: ['nekobot'] },
    gah: { type: 'sfw', providers: ['nekobot'] },

    // ---- NSFW ----
    nsfw_waifu: { type: 'nsfw', providers: ['waifu.im'] },
    nsfw_neko: { type: 'nsfw', providers: ['nekobot'] },
    hentai: { type: 'nsfw', providers: ['nekobot', 'waifu.im'] },
    ero: { type: 'nsfw', providers: ['waifu.im'] },
    ecchi: { type: 'nsfw', providers: ['waifu.im'] },
    ass: { type: 'nsfw', providers: ['nekobot', 'waifu.im'] },
    milf: { type: 'nsfw', providers: ['waifu.im'] },
    oral: { type: 'nsfw', providers: ['waifu.im'] },
    paizuri: { type: 'nsfw', providers: ['nekobot', 'waifu.im'] },
    pgif: { type: 'nsfw', providers: ['nekobot'] },
    thighs: { type: 'nsfw', providers: ['nekobot'] },
    tentacle: { type: 'nsfw', providers: ['nekobot'] },
    boobs: { type: 'nsfw', providers: ['nekobot'] },
    yaoi: { type: 'nsfw', providers: ['nekobot'] },
    hneko: { type: 'nsfw', providers: ['nekobot'] },
    hkitsune: { type: 'nsfw', providers: ['nekobot'] },
    hboobs: { type: 'nsfw', providers: ['nekobot'] },
    hass: { type: 'nsfw', providers: ['nekobot'] },
    hthigh: { type: 'nsfw', providers: ['nekobot'] },
    hmidriff: { type: 'nsfw', providers: ['nekobot'] },
    hanal: { type: 'nsfw', providers: ['nekobot'] },
    pussy: { type: 'nsfw', providers: ['nekobot'] },
    thigh: { type: 'nsfw', providers: ['nekobot'] },
    anal: { type: 'nsfw', providers: ['nekobot'] },
    gonewild: { type: 'nsfw', providers: ['nekobot'] },
    "4k": { type: 'nsfw', providers: ['nekobot'] }
};

module.exports = {
    categories,
    providers: ['nekos.life', 'nekos.best', 'waifu.im', 'nekobot', 'e621', 'gifukai']
};
