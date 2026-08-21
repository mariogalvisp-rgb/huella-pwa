// api/analizar.js - Edge Function para Vercel
// Prompts profesionales de barista SCA con 15+ años de experiencia
// Mide: TAMAÑO de partícula, UNIFORMIDAD %, COHERENCIA entre análisis

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

  // PROMPT SIMPLIFICADO PARA MOLIENDA - SIN CARACTERES ESPECIALES
  const promptMolienda = `BARISTA PROFESIONAL. ANALIZA CAFE MOLIDO.

TAMAÑO PARTICULA (lo más importante):
- Fina: polvo fino como espresso
- Media-Fina: arena fina
- Media: arena media normal
- Media-Gruesa: granos visibles arena gruesa
- Gruesa: particulas grandes

UNIFORMIDAD (0-100%):
- 95-100: Todas igual tamaño
- 80-94: Buena uniformidad
- 60-79: Uniforme con variacion
- 40-59: Bastante irregular
- 0-39: Muy irregular

COLOR Y TOSTION:
- Claro: #C8A070 Agtron 95
- Medio-Claro: #A89060 Agtron 70
- Medio: #7B5A30 Agtron 55
- Medio-Oscuro: #5A3820 Agtron 42
- Oscuro: #3D2415 Agtron 28

CONFIANZA (basada en UNIFORMIDAD):
- Alta: más de 80% uniformidad
- Media: 60-80% uniformidad
- Baja: menos 60% uniformidad

METODOS COMPATIBLES:
Fina=Espresso | Media-Fina=V60 | Media=Chemex | Media-Gruesa=Prensa | Gruesa=Cupping

DEVUELVE SOLO JSON VALIDO:
{
  "molienda_tipo": "Media-Gruesa",
  "tamaño_mm": "2-3",
  "particula_uniformidad": 85,
  "color_molienda": "Marron oscuro",
  "tueste_nivel": "Medio-Oscuro",
  "hex": "#5A3820",
  "agtron": 42,
  "confianza": "Alta",
  "metodos": [
    {"n": "Prensa Francesa", "r": "Cuerpo completo", "i": "cafe", "c": "ideal"},
    {"n": "Moka", "r": "Intensidad tostado", "i": "moka", "c": "ideal"}
  ],
  "sabores_esperados": ["chocolate", "nueces", "caramelo"],
  "tips": ["Agua 88-92C", "Tiempo 4-5 min", "Ratio 1:15"]
}`;

  // PROMPT SIMPLIFICADO PARA TAZA - SIN CARACTERES ESPECIALES
  const promptTaza = `BARISTA PROFESIONAL. ANALIZA CAFE EN TAZA.

METODO (por visuales):
- V60: transparente, claro, cuerpo ligero
- Prensa: opaco, oscuro, cuerpo denso
- Chemex: muy claro, sin particulas
- Moka: oscuro, concentrado, cremoso

COLOR REAL (independiente metodo):
- #C8A070 Ambar claro: Sub-extraido debil plano
- #7B5A30 Marron: Bien extraido balanceado
- #3D2415 Muy oscuro: Sobre-extraido amargo

EXTRACCION (basada en COLOR + METODO):
Si V60 ve claro: Sub-extraida
Si Prensa ve #7B5A30: Sub-extraida debe ser mas oscuro
Si color consistente con metodo: Bien extraida

CONFIANZA (foto clara + coherencia):
- Alta: foto nitida color visible coherente
- Media: foto decente reflejos o angulo
- Baja: foto borrosa color ambiguo

DEVUELVE SOLO JSON VALIDO:
{
  "metodo_detectado": "Prensa Francesa",
  "color_taza": "Marron oscuro",
  "extraccion": "Bien extraida",
  "hex": "#5A3820",
  "agtron": 42,
  "transparencia": "Opaca normal Prensa",
  "confianza": "Alta",
  "puntaje_visual": 82,
  "diagnostico": [
    {"n": "Color", "d": "Marron oscuro consistente", "e": "bien", "i": "ok"},
    {"n": "Extraccion", "d": "Tiempo temperatura correctos", "e": "bien", "i": "ok"}
  ],
  "sabores": ["chocolate", "nueces", "caramelo"],
  "ajustes": ["Mantener tiempo 4-5 min", "Agua 88-92C", "Molienda gruesa"]
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
