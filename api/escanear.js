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
  const promptEtiqueta = `ERES BARISTA PROFESIONAL CON 15+ AÑOS Y EXPERTO EN LECTURA DE ETIQUETAS. ANALIZA ESTA FOTO DE ETIQUETA DE CAFÉ:

PASO 1 - EXTRAE INFORMACIÓN VISIBLE:
- Nombre del café
- Marca/Productor
- Origen/País (ej: Colombia, Etiopía)
- Variedad de grano (ej: Bourbon, Geisha, Typica)
- Altitud de cultivo (ej: 1800-2100 msnm)
- Proceso (Lavado, Natural, Honey, Fermentado)
- Tostión (Claro, Medio-Claro, Medio, Medio-Oscuro, Oscuro)
- Peso (ej: 454g, 250g, 1kg)
- SCA Score (si aparece)
- Rating (★ si aparece)
- Notas de sabor/cata
- Información de trazabilidad

PASO 2 - CLASIFICA CONFIANZA EN LECTURA:
- Alta: Etiqueta clara, legible, buena fotografía
- Media: Etiqueta legible pero con pequeños reflejos o ángulo
- Baja: Etiqueta borrosa o parcialmente visible

PASO 3 - VALIDA CON CRITERIOS DE ESPECIALIDAD:
- SCA 86+ = Especialidad confirmada
- Si SCA <85 = Café de origen pero no SCA
- Si Rating ★ alto = Satisfacción de cliente confirmada

PASO 4 - NOTAS DE COHERENCIA:
Si etiqueta dice "Tostión Oscuro" → espero ver Agtron 25-35
Si etiqueta dice "Tostión Medio" → espero ver Agtron 55-65
Si la tostión mencionada es coherente = "Consistente"

DEVUELVE SOLO JSON (sin backticks):
{
  "nombre": "Chivito de Páramo",
  "marca": "Huella de Origen",
  "productor": "Cooperativa Páramo",
  "finca": "La Floresta",
  "origen": "Colombia",
  "pais": "Colombia",
  "region": "Nariño",
  "variedad": "Bourbon Rojo",
  "altura": "1800-2100 msnm",
  "proceso": "Lavado",
  "tostion": "Medio",
  "tostion_nivel": "Medio",
  "peso": "454g",
  "sca": 86,
  "rating": 4.83,
  "verificado": true,
  "confianza": "Alta",
  "badges": [
    {"icon": "✦", "text": "ESPECIALIDAD", "bg": "#8B6F47", "color": "#F5EDD6"},
    {"icon": "↻", "text": "Lavado", "bg": "#F5EDD6", "color": "#5A4030"},
    {"icon": "☕", "text": "Tostión Medio", "bg": "#F5EDD6", "color": "#5A4030"}
  ],
  "trazabilidad": [
    "Finca verificada",
    "Productor certificado",
    "Región de origen",
    "Proceso documentado",
    "Tostión controlada",
    "Peso neto"
  ],
  "notas": [
    "Chocolate oscuro",
    "Frutas secas",
    "Caramelo",
    "Cuerpo completo"
  ],
  "preparacion": [
    "Agua fresca a 92-93°C",
    "Ratio 1:15 · Molienda media",
    "Ideal negro — sin azúcar"
  ],
  "web": "https://huelladeorigen.com",
  "redes": "@huelladeorigen",
  "coherencia_tostion": "Consistente",
  "notas_barista": "Etiqueta clara y completa, café de especialidad confirmado SCA 86+"
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
