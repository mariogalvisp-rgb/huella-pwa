// api/buscar.js - Edge Function para Vercel
// Proxy seguro para buscar cafés

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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Busca información sobre el café: "${query}"

Devuelve un JSON con:
{
  "nombre": "nombre exacto",
  "marca": "productor/marca",
  "origen": "país/región",
  "sca": número,
  "perfil": ["notas de sabor"],
  "proceso": "Lavado/Natural/Honey",
  "altitud": "rango msnm",
  "varietales": ["varietal1"],
  "recomendacion": "método de preparación recomendado",
  "precio_aprox": "rango de precio USD",
  "rating": número entre 0-5
}

Si es un café conocido (Chivito de Páramo, Quetzal, etc.), usa datos reales de Huella de Origen.
Si no conoces el café, devuelve datos aproximados basados en origen/tipo.`
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
      const result = JSON.parse(jsonMatch[0]);
      return res.status(200).json(result);
    } catch (parseErr) {
      return res.status(200).json({ error: 'Invalid JSON: ' + parseErr.message, raw: jsonMatch[0] });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
