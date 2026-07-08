// /api/8ball.js — Vercel Serverless Function para la Bola 8 mágica con respuestas locales en español

const RESPUESTAS_8BALL = [
    // Afirmativas
    "En verdad sí.",
    "Es decididamente así.",
    "Sin lugar a dudas.",
    "Sí, definitivamente.",
    "Puedes confiar en ello.",
    "Como yo lo veo, sí.",
    "Lo más probable.",
    "Perspectiva buena.",
    "Sí.",
    "Las señales apuntan a que sí.",
    
    // Neutras / Dudosas
    "Respuesta vaga, vuelve a intentarlo.",
    "Pregunta en otro momento.",
    "Mejor no decirte ahora.",
    "No puedo predecirlo ahora.",
    "Concéntrate y vuelve a preguntar.",
    
    // Negativas
    "No cuentes con ello.",
    "Mi respuesta es no.",
    "Mis fuentes dicen que no.",
    "Las perspectivas no son muy buenas.",
    "Muy dudoso."
];

export default async function handler(req, res) {
    // Cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Elegir respuesta aleatoria
    const randomIndex = Math.floor(Math.random() * RESPUESTAS_8BALL.length);
    const answer = RESPUESTAS_8BALL[randomIndex];

    return res.status(200).json({ response: answer });
}
