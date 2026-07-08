// api/_translator.js — Helper compartido para traducir usando modelos Gemma de Google AI Studio
// Utiliza gemma-4-31b-it como modelo principal, con fallbacks a gemma-2-27b-it y gemma-2-9b-it.

export async function translateText(text) {
    if (!text || !text.trim()) {
        return '';
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Configuración incompleta: GEMINI_API_KEY ausente.');
    }

    // Prompt adaptado para exigir el JSON con la traducción limpia
    const prompt = `Traduce el siguiente texto al español manteniendo su tono original (sea informativo, curioso o reflexivo).
Devuelve el resultado en formato JSON estructurado según el esquema solicitado.
El campo "translation" debe contener únicamente la traducción final, sin comillas externas adicionales, sin explicaciones ni rodeos.

Texto original a traducir:
"${text.trim()}"`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    translation: {
                        type: "STRING",
                        description: "La traducción limpia y directa al español sin notas explicativas."
                    }
                },
                required: ["translation"]
            }
        }
    };

    // Cascada de modelos Gemma (del más potente de la capa gratuita a los más eficientes)
    const models = ['gemma-4-31b-it', 'gemma-2-27b-it', 'gemma-2-9b-it'];
    let lastError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    const rawText = data.candidates[0].content.parts[0].text.trim();
                    
                    // Extraer traducción con el parser robusto
                    let translation = extractTranslation(rawText);

                    // Limpieza final de comillas redundantes
                    if (translation.startsWith('"') && translation.endsWith('"')) {
                        translation = translation.slice(1, -1).trim();
                    }
                    if (translation.startsWith('«') && translation.endsWith('»')) {
                        translation = translation.slice(1, -1).trim();
                    }

                    console.log(`[Traductor Helper] Éxito al traducir con el modelo: ${model}`);
                    return translation;
                }
            } else {
                const errText = await response.text();
                console.warn(`[Traductor Helper] Intento fallido con ${model} (HTTP ${response.status}): ${errText}`);
                lastError = `HTTP ${response.status}: ${errText}`;
            }
        } catch (err) {
            console.error(`[Traductor Helper] Error al conectar con el modelo ${model}:`, err);
            lastError = err.message || err;
        }
    }

    throw new Error(`Todos los intentos de traducción con Gemma fallaron. Detalles: ${lastError}`);
}

/**
 * Parsea y limpia de forma extremadamente robusta la respuesta de traducción de la IA.
 * Resuelve problemas de markdown, objetos JSON embebidos y strings mal formateados.
 * @param {string} rawText - Texto original de la API de Google AI Studio.
 * @returns {string} Traducción limpia.
 */
function extractTranslation(rawText) {
    if (typeof rawText !== 'string') return '';
    let cleaned = rawText.trim();
    
    // 1. Quitar bloques de código markdown de JSON si existen (e.g. ```json ... ``` o ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    // 2. Intentar parsear directamente el objeto completo
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object' && parsed.translation) {
            return parsed.translation.trim();
        }
    } catch (e) {
        // Continuar al método de extracción por regex si falla
    }

    // 3. Buscar el primer objeto JSON {...} en el texto mediante regex e intentar parsearlo
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed && typeof parsed === 'object' && parsed.translation) {
                return parsed.translation.trim();
            }
        } catch (e) {
            // Continuar
        }
    }

    // 4. Extraer el valor del campo "translation" directamente usando regex buscando "translation": "..."
    const keyMatch = cleaned.match(/"translation"\s*:\s*"([\s\S]*?)"/);
    if (keyMatch && keyMatch[1]) {
        return keyMatch[1].trim();
    }

    // 5. Fallback final: Devolver el texto limpio como está
    return cleaned;
}
