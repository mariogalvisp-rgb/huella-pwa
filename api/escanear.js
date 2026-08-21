// api/escanear.js - Edge Function para Vercel
// Proxy seguro para escanear etiquetas de café

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
        max_tokens: 2048,
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
                text: `Lee esta etiqueta de café. DEVUELVE SOLO JSON VÁLIDO:

{
  "nombre": "Chivito de Páramo",
  "marca": "Huella de Origen",
  "productor": "Don Alfonso",
  "finca": "Buenavista",
  "sca": 86,
  "rating": 4.83,
  "verificado": true,
  "origen": "Cajamarca, Tolima",
  "variedad": "Caturra",
  "altura": "1850 msnm",
  "proceso": "Lavado",
  "tostion": "Medio",
  "peso": "454g",
  "badges": [
    {"icon": "✦", "text": "ESPECIALIDAD", "bg": "#8B6F47", "color": "#F5EDD6"},
    {"icon": "↻", "text": "Lavado", "bg": "#F5EDD6", "color": "#5A4030"},
    {"icon": "☕", "text": "Tostión Media", "bg": "#F5EDD6", "color": "#5A4030"}
  ],
  "trazabilidad": ["Finca Buenavista", "Don Alfonso", "Cajamarca", "Lavado", "Tostión Media", "454g"],
  "notas": ["Panela", "Miel", "Floral", "Aromático", "Acidez media"],
  "preparacion": [
    "V60 o Chemex a 92-93°C para resaltar notas florales",
    "Ratio 1:15 · Molienda media-fina",
    "Ideal negro — el dulzor natural no necesita azúcar"
  ]
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
      const scanResult = JSON.parse(jsonStr);
      return res.status(200).json(scanResult);
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
