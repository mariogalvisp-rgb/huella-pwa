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

  // PROMPT PROFESIONAL DE BARISTA - MOLIENDA
  const promptMolienda = `ERES BARISTA PROFESIONAL CON 15+ AÑOS. ANALIZA ESTA MOLIENDA:

PASO 1 - MIDE TAMAÑO DE PARTÍCULA (lo más crítico):
Observa el diámetro promedio de los granos:
- Fina (Espresso): 0.5-1mm - partículas casi polvo
- Media-Fina (V60): 1-1.5mm - polvo fino con textura
- Media (Chemex): 1.5-2mm - polvo medio, como arena fina
- Media-Gruesa (Prensa): 2-3mm - granos visibles, tipo arena
- Gruesa (Cupping): 3-4mm - granos grandes, claramente visibles

PASO 2 - MIDE UNIFORMIDAD (0-100%):
- 95-100%: Todas las partículas IGUAL tamaño, perfectamente uniforme
- 80-94%: Buena uniformidad, mínimas variaciones
- 60-79%: Uniforme pero con algunas partículas más finas o gruesas
- 40-59%: Bastante irregular, mezcla de tamaños notoria
- 0-39%: Muy irregular, polvo fino + granos grandes mezclados

PASO 3 - COLOR/TOSTIÓN (independiente):
Compara con ESCALA AGTRON:
- #C8A070 (Agtron 95): Claro - café pálido
- #A89060 (Agtron 70): Medio-Claro - café marrón claro
- #7B5A30 (Agtron 55): Medio - café marrón balanceado
- #5A3820 (Agtron 42): Medio-Oscuro - café marrón oscuro
- #3D2415 (Agtron 28): Oscuro - café casi negro

PASO 4 - CONFIANZA EN ANÁLISIS (basada en UNIFORMIDAD):
- Alta: >80% uniformidad + foto clara
- Media: 60-80% uniformidad
- Baja: <60% uniformidad o foto pobre

PASO 5 - METODOS COMPATIBLES (según TAMAÑO):
Fina → Espresso | Media-Fina → V60/Pourover | Media → Chemex | Media-Gruesa → Prensa | Gruesa → Cupping

DEVUELVE SOLO JSON (sin backticks):
{
  "molienda_tipo": "Media-Gruesa",
  "tamaño_mm": "2-3",
  "particula_uniformidad": 85,
  "color_molienda": "Marrón oscuro",
  "tueste_nivel": "Medio-Oscuro",
  "hex": "#5A3820",
  "agtron": 42,
  "confianza": "Alta",
  "metodos": [
    {"n": "Prensa Francesa", "r": "Cuerpo completo y notas robustas", "i": "☕", "c": "ideal"},
    {"n": "Moka", "r": "Intensidad y dulzor tostado", "i": "🫖", "c": "ideal"},
    {"n": "V60", "r": "Requiere ajuste por tamaño", "i": "🌐", "c": "ok"}
  ],
  "sabores_esperados": ["chocolate oscuro", "nueces", "caramelo quemado"],
  "tips": [
    "Agua 88-92°C para tostión oscura",
    "Tiempo extracción 4-5 minutos",
    "Ratio 1:15 para cuerpo completo"
  ],
  "notas_barista": "Tostión consistente, uniformidad buena, ideal para métodos de inmersión"
}`;

  // PROMPT PROFESIONAL DE BARISTA - TAZA
  const promptTaza = `ERES BARISTA PROFESIONAL CON 15+ AÑOS. ANALIZA ESTA TAZA:

PASO 1 - IDENTIFICA MÉTODO (por características visuales):
- V60/Pourover: Bebida transparente, colores claros, cuerpo ligero
- Prensa Francesa: Bebida opaca/turbia, colores oscuros, cuerpo denso
- Chemex: Muy clara, sin partículas, aspecto "limpio"
- Moka: Oscura, concentrada, cremosa

PASO 2 - EVALÚA COLOR REAL (independiente de método):
Compara con ESCALA:
- #C8A070 (Ámbar claro): Sub-extraída (débil, plana)
- #7B5A30 (Marrón): Bien extraída (balanceada)
- #3D2415 (Muy oscuro): Sobre-extraída (amarga, quemada)

PASO 3 - EVALÚA EXTRACCIÓN (basada en COLOR + MÉTODO):
Si V60 ve #C8A070 = Sub-extraída (debería ser más oscuro)
Si Prensa ve #7B5A30 = Sub-extraída (debería ser #5A3820 mínimo)
Si color es consistente con método = Bien extraída

PASO 4 - MIDE CONFIANZA (basada en CLARIDAD de foto + COHERENCIA con método):
- Alta: Foto nítida, color visible, coherente con método
- Media: Foto decente pero con reflejos o ángulo
- Baja: Foto borrosa o color ambiguo

PASO 5 - VALIDA COHERENCIA CON MOLIENDA (si la conoces):
Si molienda era Medio-Oscuro/Gruesa → espero ver taza oscura
Si molienda era Medio/Media → espero ver taza marrón medio
INCONSISTENCIA = Alerta al usuario

DEVUELVE SOLO JSON (sin backticks):
{
  "metodo_detectado": "Prensa Francesa",
  "color_taza": "Marrón oscuro",
  "extraccion": "Bien extraída",
  "hex": "#5A3820",
  "agtron": 42,
  "transparencia": "Opaca (normal para Prensa)",
  "confianza": "Alta",
  "puntaje_visual": 82,
  "diagnostico": [
    {"n": "Color", "d": "Marrón oscuro consistente con Prensa Francesa", "e": "bien", "i": "✓"},
    {"n": "Extracción", "d": "Tiempo y temperatura correctos, sin amargor excesivo", "e": "bien", "i": "✓"},
    {"n": "Cuerpo", "d": "Viscosidad apropiada, bebida densa", "e": "bien", "i": "✓"}
  ],
  "sabores": ["chocolate oscuro", "nueces tostadas", "caramelo"],
  "ajustes": [
    "Mantener tiempo extracción 4-5 minutos",
    "Agua entre 88-92°C",
    "Molienda gruesa uniforme"
  ],
  "notas_barista": "Extracción consistente, preparación correcta para Prensa Francesa"
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
