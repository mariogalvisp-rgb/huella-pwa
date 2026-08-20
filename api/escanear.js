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
                text: `ANÁLISIS DE TRAZABILIDAD - CAFÉ DE ESPECIALIDAD

Analiza esta etiqueta de café y extrae INFORMACIÓN DE TRAZABILIDAD.
La bolsa puede estar sellada, molida o en grano.

Devuelve un JSON con esta estructura:
{
  "cafe_nombre": "nombre del café",
  "productor": "nombre del productor",
  "finca": "nombre de la finca",
  "origen": "país/región/ciudad",
  "altitud": "msnm (ej: 1800 msnm)",
  "variedad": "varietal(es) - ej: Castillo, Geisha, Colombia",
  "proceso": "Lavado/Natural/Honey/Fermentado/otro",
  "sca_score": "número si aparece (ej: 86)",
  "peso": "tamaño de bolsa",
  "tostador": "nombre del tostador/marca",
  "fecha": "fecha de tostado si aparece",
  "certificaciones": ["Orgánico", "Fair Trade", "Direct Trade", "etc"],
  
  "trazabilidad_calificacion": "Excelente/Buena/Básica",
  "trazabilidad_detalles": "Evalúa: origen específico + altitud + variedad + proceso + SCA. Un café de especialidad debe tener origen específico (no 'Blend'), altitud, variedad y método de proceso claramente identificados.",
  
  "caracteristicas_especialidad": {
    "tiene_origen_especifico": true/false,
    "tiene_altitud": true/false,
    "tiene_variedad": true/false,
    "tiene_sca_score": true/false,
    "tiene_proceso_identificado": true/false
  },
  
  "es_especialidad": true/false,
  "por_que": "Explicación clara si cumple o no con estándares de especialidad"
}

IMPORTANTE:
- Extrae EXACTAMENTE lo que ves en la etiqueta
- Califica como "especialidad" solo si: origen específico + altitud + variedad + proceso claramente identificados
- Si está sellado, no importa - extrae la información visible del empaque
- SCA 85+ es estándar de especialidad`
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
