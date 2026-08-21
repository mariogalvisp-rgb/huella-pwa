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
                text: `ANÁLISIS DE ESPECIALIDAD EN TAZA - CAFÉ\n\nAnaliza esta foto de café en taza y evalúa si tiene CARACTERÍSTICAS DE ESPECIALIDAD.\n\nDevuelve un JSON con:\n{\n  "metodo_estimado": "V60/Prensa Francesa/Espresso/Vertido/Aeropress",\n  "color": {\n    "observado": "Descripción del color visible",\n    "es_cafe_no_negro": true,\n    "evaluacion": "El color café indica extracción controlada de especialidad"\n  },\n  "caracteristicas_visuales": {\n    "claridad": "Clara/Traslúcida/Opaca",\n    "brillo": "Con brillo/Sin brillo",\n    "transparencia": "Transparente/Semi-opaca/Opaca",\n    "cuerpo_visual": "Ligero/Medio/Completo"\n  },\n  "extraccion": {\n    "nivel": "Sub-extraído/Óptimo/Sobre-extraído",\n    "diagnostico": "Basado en color + claridad + método",\n    "nota": "V60 claro/delicado es CORRECTO. Prensa oscuro/cuerpo completo es CORRECTO."\n  },\n  "calificacion_especialidad": {\n    "es_especialidad": true,\n    "score_visual": 8,\n    "razones": ["Color café indica extracción controlada", "Claridad/opacidad apropiada al método"]\n  },\n  "sabores_probables": ["sabor1", "sabor2"],\n  "temperatura_recomendada": "80-92C",\n  "tips": ["tip1", "tip2"]\n}\n\nCRITERIOS: Color café NO negro = BUENA EXTRACCIÓN. V60 transparente = CORRECTO. Prensa opaca = CORRECTO.`
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
