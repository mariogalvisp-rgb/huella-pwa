// api/escanear.js - Edge Function para Vercel
// Proxy seguro para escanear etiquetas de café
// Prompts profesionales de barista SCA con 15+ años

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

  // PROMPT PROFESIONAL DE BARISTA - ESCANEAR ETIQUETA
  const promptEtiqueta = `ERES BARISTA PROFESIONAL CON 15+ AÑOS Y EXPERTO EN LECTURA DE ETIQUETAS.

TAREA CRÍTICA: Diferencia entre ESPECIALIDAD vs COMERCIAL

ESPECIALIDAD = SCA 86+ + Trazabilidad REAL (finca, región, altitud, variedad)
COMERCIAL = Sin trazabilidad, genérico, SCA no verificable

PASO 1 - EXTRAE INFORMACIÓN VISIBLE:
- Nombre del café
- Marca/Productor
- Origen (ej: "Colombia" genérico vs "Nariño, Finca X")
- Variedad (ej: "Bourbon Rojo" específico vs "Arábica" genérico)
- Altitud (ej: "1800-2100 msnm" específico vs AUSENTE)
- Proceso (Lavado, Natural, Honey, Fermentado)
- Tostión (Claro, Medio, Fuerte, Oscuro) - SIEMPRE INCLUYE SI APARECE
- Peso
- SCA Score (si aparece)
- Rating (★ si aparece)

PASO 2 - VALIDA TRAZABILIDAD:
ESPECIALIDAD = Finca NOMBRADA + Región ESPECÍFICA + Altitud EXACTA + Variedad ESPECÍFICA
COMERCIAL = "Colombia" genérico, "Arábica" genérico, sin finca, sin altitud exacta

PASO 3 - VALIDA CERTIFICACIÓN SCA:
- SCA VERIFICABLE = Viene con certificado oficial, número de lote, datos de cata
- SCA NO VERIFICABLE = Solo dice "SCA 86" en el empaque sin certificación real
- COMERCIAL = No dice SCA, solo "de masa"

PASO 4 - CLASIFICA TIPO DE CAFÉ:
- ESPECIALIDAD: Trazabilidad completa + SCA 86+ verificable
- COMERCIAL: Falta trazabilidad O SCA no verificable
- MASA: Genérico, sin información técnica

PASO 5 - CONFIANZA EN LECTURA:
- Alta: Etiqueta clara, legible, foto nítida
- Media: Legible pero con pequeños reflejos
- Baja: Borrosa o parcialmente visible

DEVUELVE SOLO JSON (sin backticks):
{
  "nombre": "Viejo Molino",
  "marca": "Viejo Molino",
  "tipo_cafe": "Comercial",
  "trazabilidad": "Genérica (sin finca, región o altitud exacta)",
  "origen": "Colombia",
  "pais": "Colombia",
  "region": null,
  "finca": null,
  "variedad": "Arábica (genérica, no específica)",
  "altura": null,
  "proceso": "Lavado",
  "tostion": "Fuerte",
  "tostion_nivel": "Fuerte",
  "peso": "454g",
  "sca": null,
  "sca_verificable": false,
  "sca_nota": "No es café SCA certificado - solo publicidad en empaque",
  "rating": null,
  "verificado": false,
  "confianza": "Alta",
  "badges": [
    {"icon": "☕", "text": "Tostión Fuerte", "bg": "#8B6F47", "color": "#F5EDD6"},
    {"icon": "100%", "text": "Puro", "bg": "#F5EDD6", "color": "#5A4030"},
    {"icon": "↻", "text": "Lavado", "bg": "#F5EDD6", "color": "#5A4030"}
  ],
  "trazabilidad_items": [
    "Proceso: Lavado documentado",
    "Tostión: Fuerte especificado",
    "Pureza: 100% confirmado"
  ],
  "notas": [
    "Cuerpo robusto",
    "Sabor fuerte",
    "Amargor intenso",
    "Ideal para postres"
  ],
  "preparacion": [
    "Agua 85-88°C (tostión fuerte)",
    "Ratio 1:10-1:12 para más cuerpo",
    "Ideal con leche o negro fuerte",
    "Prensa Francesa recomendada"
  ],
  "web": null,
  "redes": null,
  "clasificacion_final": "CAFÉ COMERCIAL / DE MASA",
  "notas_barista": "Café comercial sin certificación SCA. Información verificable: Tostión Fuerte, Proceso Lavado, 100% Puro. Sin trazabilidad de finca. Ideal para uso doméstico masivo."
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
                text: promptEtiqueta
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
