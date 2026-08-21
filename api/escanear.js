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
  const promptEtiqueta = `ERES BARISTA PROFESIONAL. LEE ESTA ETIQUETA DE CAFE.

EXTRAE EXACTAMENTE:
- nombre: El nombre del cafe (texto)
- marca: La marca (texto)
- origen: Pais (ej: Colombia, Ethiopia)
- region: Region especifica o null
- finca: Nombre finca o null
- variedad: Variedad especifica (ej: Bourbon) o null
- altura: Altitud ej 1800 o null
- proceso: Lavado, Natural, Honey, Fermentado
- tostion: Claro, Medio, Fuerte, Oscuro
- peso: ej 454g
- sca: numero o null
- sca_verificable: true si tiene certificado, false si no
- rating: numero con decimales o null
- verificado: true o false
- confianza: Alta, Media, Baja
- tipo_cafe: Especialidad o Comercial
- notas: lista de 3-4 sabores simples (sin caracteres especiales)
- preparacion: lista de 2-3 metodos simples

DEVUELVE SOLO JSON VALIDO, SIN COMILLAS EN VALORES:
{
  "nombre": "Quetzal",
  "marca": "Marca",
  "origen": "Colombia",
  "region": "Tolima",
  "finca": "Nombre",
  "variedad": "Castillo",
  "altura": "1900",
  "proceso": "Lavado",
  "tostion": "Medio",
  "peso": "454g",
  "sca": 86,
  "sca_verificable": true,
  "rating": 5.0,
  "verificado": true,
  "confianza": "Alta",
  "tipo_cafe": "Especialidad",
  "notas": ["Chocolate", "Frutas", "Caramelo"],
  "preparacion": ["V60", "Prensa", "Chemex"],
  "notas_barista": "Cafe de especialidad con trazabilidad completa"
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
