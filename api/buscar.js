// api/buscar.js - Edge Function para Vercel
// Búsqueda de información sobre cafés
// Prompts profesionales de barista

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const promptBusqueda = `ERES EXPERTO EN CAFÉS ESPECIALES Y BARISTA CON 15+ AÑOS DE EXPERIENCIA.

El usuario pregunta: "${query}"

RESPONDE COMO BARISTA PROFESIONAL:
- Si es sobre tostión, molienda o extracción: Da recomendación técnica precisa
- Si es sobre orígenes: Describe perfil de sabor y características del café
- Si es sobre métodos de preparación: Guía paso a paso profesional
- Si es sobre variedades: Explica genética y características
- Si es sobre problemas de café: Diagnostica como SCA Certified

DEVUELVE RESPUESTA CLARA, PRÁCTICA Y PROFESIONAL (máx 300 caracteres).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: promptBusqueda
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'API error' });
    }

    const data = await response.json();
    const respuesta = data.content[0].text;

    return res.status(200).json({ 
      respuesta: respuesta,
      confianza: 'Alta'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
