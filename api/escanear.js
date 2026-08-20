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
                text: `ANÁLISIS DE TRAZABILIDAD - CAFÉ DE ESPECIALIDAD\n\nAnaliza esta etiqueta de café y extrae INFORMACIÓN DE TRAZABILIDAD.\nLa bolsa puede estar sellada, molida o en grano.\n\nDevuelve un JSON con:\n{\n  "cafe_nombre": "nombre del café",\n  "productor": "nombre del productor",\n  "finca": "nombre de la finca",\n  "origen": "país/región/ciudad",\n  "altitud": "msnm (ej: 1800 msnm)",\n  "variedad": "varietal(es)",\n  "proceso": "Lavado/Natural/Honey/Fermentado",\n  "sca_score": "número si aparece (ej: 86)",\n  "peso": "tamaño de bolsa",\n  "tostador": "nombre del tostador",\n  "fecha": "fecha de tostado si aparece",\n  "certificaciones": ["Orgánico", "Fair Trade"],\n  "trazabilidad_calificacion": "Excelente/Buena/Básica",\n  "caracteristicas_especialidad": {\n    "tiene_origen_especifico": true,\n    "tiene_altitud": true,\n    "tiene_variedad": true,\n    "tiene_sca_score": true,\n    "tiene_proceso_identificado": true\n  },\n  "es_especialidad": true,\n  "razon": "Explicación clara"\n}\n\nIMPORTANTE: Extrae exactamente lo que ves. SCA 85+ es especialidad.`
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
