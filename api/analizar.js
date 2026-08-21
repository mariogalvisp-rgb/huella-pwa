// api/analizar.js - Edge Function para Vercel
// Proxy seguro que usa ANTHROPIC_API_KEY de variables de entorno
// Soporta análisis de MOLIENDA y TAZA con prompts específicos

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image, type } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: 'Image base64 required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Prompt específico para MOLIENDA (detecta tostión con precisión)
  const promptMolienda = `ANALIZA ESTA FOTO DE CAFÉ MOLIDO COMO ESPECIALISTA. COMPARA EL COLOR CON AGTRON:
- Claro/Light: #C8A070 (Agtron 95) - café muy pálido
- Medio-Claro/City: #A89060 (Agtron 70-75) - café marrón claro
- Medio/Full City: #7B5A30 (Agtron 55-60) - café marrón estándar
- Medio-Oscuro/French: #5A3820 (Agtron 40-45) - café oscuro
- Oscuro/Espresso: #3D2415 (Agtron 25-30) - café muy oscuro/negro

OBSERVA: Tamaño de partículas, brillo, uniformidad, aceites visibles.

DEVUELVE SOLO JSON:
{
  "molienda_tipo": "Media" o "Media-Fina" o "Fina" o "Gruesa",
  "molienda_desc": "Descripción breve",
  "tueste_nivel": "Claro" o "Medio-Claro" o "Medio" o "Medio-Oscuro" o "Oscuro",
  "hex": "#6B4423",
  "agtron": "55",
  "confianza": "Alta",
  "metodos": [
    {"n": "V60", "r": "Claridad y acidez", "i": "🌐", "c": "ideal"},
    {"n": "Prensa", "r": "Cuerpo completo", "i": "☕", "c": "ok"}
  ],
  "sabores": ["chocolate", "frutas", "caramelo"],
  "tips": ["Agua 92-93°C", "Molienda uniforme", "Ratio 1:15"]
}`;

  // Prompt específico para TAZA (detecta extracción)
  const promptTaza = `ANALIZA ESTA FOTO DE CAFÉ EN TAZA COMO ESPECIALISTA SCA. EVALÚA:
1. Color: Tonalidad (marrón claro/medio/oscuro)
2. Extracción: Sub-extraído (claro/pálido), Bien (marrón balanceado), Sobre-extraído (muy oscuro)
3. Transparencia: Vs opacidad según método (V60=transparente, Prensa=opaca)
4. Cuerpo: Viscosidad percibida

DEVUELVE SOLO JSON:
{
  "bebida": "Café de especialidad",
  "extraccion": "Bien extraído" o "Sub-extraído" o "Sobre-extraído",
  "color": "Describe el tono",
  "tueste": "Medio",
  "concentracion": "Cuerpo medio-completo",
  "confianza": "Alta",
  "puntaje": 82,
  "hex": "#6B4423",
  "agtron": "55",
  "diagnostico": [
    {"n": "Color", "d": "Descripción", "e": "bien", "i": "✓"},
    {"n": "Transparencia", "d": "Según método", "e": "bien", "i": "✓"}
  ],
  "sabores": ["chocolate oscuro", "frutas", "caramelo"],
  "ajustes": ["Extracción 4-5 min", "Agua 85-90°C", "Molienda consistente"]
}`;

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
                text: type === 'molienda' ? promptMolienda : promptTaza
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
    
    if (jsonText.includes('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
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
