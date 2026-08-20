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
        model: 'claude-opus-4-1',
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
                text: `Extrae información de esta etiqueta de café. Devuelve un JSON:
{
  "nombre": "nombre del café",
  "marca": "marca/productor",
  "origen": "país/región",
  "ciudad": "ciudad",
  "sca": número,
  "proceso": "Lavado/Natural/Honey",
  "altitud": "msnm",
  "varietales": ["varietal1", "varietal2"],
  "notas": ["nota1", "nota2"],
  "peso": "cantidad",
  "toste": "Claro/Medio/Oscuro",
  "url": "URL si aparece"
}

Extrae solo la información visible. Sé preciso.`
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

    // Extraer JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ error: 'No JSON found in response', raw: text });
    }
    
    try {
      const scanResult = JSON.parse(jsonMatch[0]);
      return res.status(200).json(scanResult);
    } catch (parseErr) {
      return res.status(200).json({ error: 'Invalid JSON: ' + parseErr.message, raw: jsonMatch[0] });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
