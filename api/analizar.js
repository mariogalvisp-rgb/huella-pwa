// api/analizar.js - Edge Function para Vercel
// Proxy seguro que usa ANTHROPIC_API_KEY de variables de entorno

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: 'Image base64 required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

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
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: `Analiza esta foto de café en taza como especialista SCA. DEVUELVE SOLO JSON VÁLIDO:

{
  "bebida": "Café de especialidad",
  "extraccion": "Bien extraído",
  "color": "Marrón (describe el tono)",
  "tueste": "Medio",
  "concentracion": "Cuerpo medio-completo",
  "confianza": "Alta",
  "puntaje": 82,
  "hex": "#6B4423",
  "agtron": "55",
  "diagnostico": [
    {"n": "Color", "d": "Tono marrón indica extracción balanceada", "e": "bien", "i": "✓"},
    {"n": "Claridad", "d": "Bebida transparente vs opaca según método", "e": "bien", "i": "✓"},
    {"n": "Cuerpo", "d": "Viscosidad apropiada para especialidad", "e": "bien", "i": "✓"}
  ],
  "sabores": ["chocolate oscuro", "frutas secas", "nueces", "caramelo"],
  "ajustes": ["Mantener tiempo de extracción 4-5 minutos", "Temperatura de agua 85-90°C", "Molienda media consistente"]
}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'API error' });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Limpiar la respuesta y extraer JSON
    let jsonText = text.trim();
    
    // Si tiene ```json, quitarlo
    if (jsonText.includes('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Encontrar el primer { y el último }
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(200).json({ error: 'No JSON found', raw: text });
    }
    
    const jsonStr = jsonText.substring(firstBrace, lastBrace + 1);
    
    try {
      const analysis = JSON.parse(jsonStr);
      return res.status(200).json(analysis);
    } catch (parseErr) {
      return res.status(200).json({ 
        error: 'Invalid JSON: ' + parseErr.message, 
        raw: jsonStr.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
