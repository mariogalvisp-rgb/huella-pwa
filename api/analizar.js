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
                text: `ANÁLISIS DE ESPECIALIDAD EN TAZA - CAFÉ

Analiza esta foto de café en taza y evalúa si tiene CARACTERÍSTICAS DE ESPECIALIDAD.
La taza puede ser de cualquier método: V60, Prensa Francesa, Espresso, Vertido, etc.

Devuelve un JSON con esta estructura:
{
  "metodo_estimado": "V60/Prensa Francesa/Espresso/Vertido/Aeropress/otro",
  
  "color": {
    "observado": "Descripción del color visible",
    "es_cafe_no_negro": true/false,
    "especialidad": "El color caramel/marrón claro/miel indica extracción controlada de especialidad"
  },
  
  "caracteristicas_visuales": {
    "claridad": "Clara/Traslúcida/Opaca - Las claras indican especialidad con cuerpo delicado",
    "brillo": "Con brillo/Sin brillo - El brillo indica presencia de aceites esenciales",
    "transparencia": "Transparente/Semi-opaca/Opaca - V60 debe ser transparente, Prensa más opaca",
    "cuerpo_visual": "Ligero/Medio/Completo - Esperado según método"
  },
  
  "extraccion": {
    "nivel": "Sub-extraído/Óptimo/Sobre-extraído",
    "diagnostico": "Explicación basada en color + claridad + método",
    "IMPORTANTE": "No confundir 'sobre-extraído' con 'bien hecho para V60 o Prensa'. V60 debe ser claro/delicado. Prensa debe ser oscuro/cuerpo completo. Ambos son CORRECTOS si el color es café (no negro)."
  },
  
  "calificacion_especialidad": {
    "es_especialidad": true/false,
    "score_visual": "1-10",
    "razones": ["razón1: color café indica extracción controlada", "razón2: claridad/opacidad apropiada al método", "razón3: ausencia de quemado/carbonización"]
  },
  
  "sabores_probables": ["sabor1", "sabor2", "sabor3"],
  "metodos_compatibles": [{"nombre":"V60","ideal":true/false,"razón":"texto"}, {"nombre":"Prensa","ideal":true/false,"razón":"texto"}],
  "temperatura_recomendada": "80-92°C según método",
  "tips": ["tip1", "tip2"],
  "advertencias": "si hay alguna"
}

CRITERIOS DE ESPECIALIDAD EN TAZA:
✓ Color caramel/marrón claro (NO negro) = BUENA EXTRACCIÓN
✓ V60: Transparente, cuerpo ligero/medio, ácido visible = CORRECTO
✓ Prensa: Más opaco, cuerpo completo, sedoso = CORRECTO
✓ Presencia de brillo = Aceites esenciales presentes = ESPECIALIDAD
✓ Ausencia de carbonización/quemado = CONTROL DE TEMPERATURA

Sé preciso. El color café es una FORTALEZA de especialidad, no un defecto.`
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
