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
        model: 'claude-3-5-haiku-20241022',
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
                text: `Analiza esta foto de café molido. Proporciona un análisis JSON con:
{
  "molienda_tipo": "Fina/Media-Fina/Media/Media-Gruesa/Gruesa",
  "molienda_micras": "rango aproximado",
  "molienda_desc": "descripción breve",
  "tueste_nivel": "Claro/Medio/Oscuro",
  "tueste_color": "descripción del color",
  "agtron": "número estimado 30-95",
  "sobre_tostado": true/false,
  "aceite": true/false,
  "confianza": "Alta/Media/Baja",
  "metodos": [{"n":"Método","i":"emoji","c":"ideal/ok/no","r":"razón"}],
  "temp": "temperatura recomendada",
  "sabores": ["sabor1", "sabor2"],
  "tips": ["tip1", "tip2"],
  "adv": "advertencias si hay"
}

Sé preciso y útil.`
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

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ error: 'No JSON found in response', raw: text });
    }
    
    try {
      const analysis = JSON.parse(jsonMatch[0]);
      return res.status(200).json(analysis);
    } catch (parseErr) {
      return res.status(200).json({ error: 'Invalid JSON: ' + parseErr.message, raw: jsonMatch[0] });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

