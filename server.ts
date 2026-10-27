import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Low-latency quick reaction / fitness tip using gemini-3.1-flash-lite
app.post('/api/gemini/quick-tip', async (req, res) => {
  try {
    const { weight, hunger, health, energy, hygiene, action, spokenText } = req.body || {};
    const ai = getAiClient();

    if (!ai) {
      // Deterministic fast fallback when API key is not configured in test env
      const fallbackTips = [
        `¡Vamos! En ${Number(weight || 110).toFixed(1)} kg cada brócoli y salto de cuerda nos acerca a los 65 kg.`,
        `¡Eso estuvo genial! Recuerda hidratarte con agua y descansar en el dormitorio para recuperar energía.`,
        `¡Súper entreno! Mantén el combo en Cardio Cuerda 3D para quemar grasa el doble de rápido.`,
      ];
      return res.json({
        tip: spokenText
          ? `¡Escuché "${spokenText}"! ¡A darle con todo hacia los 65 kg!`
          : fallbackTips[Math.floor(Math.random() * fallbackTips.length)],
        model: 'gemini-3.1-flash-lite',
      });
    }

    const prompt = spokenText
      ? `El jugador le acaba de decir por micrófono a Gordou: "${spokenText}". Gordou pesa ${Number(weight || 110).toFixed(1)} kg (meta: 65 kg), Hambre ${hunger}%, Salud ${health}%, Energía ${energy}%. Responde como Gordou en primera persona en 1 sola oración corta, entusiasta, tierna y divertida (máximo 18 palabras).`
      : `Gordou pesa ${Number(weight || 110).toFixed(1)} kg (meta: 65.0 kg). Hambre: ${hunger}%, Salud: ${health}%, Energía: ${energy}%, Higiene: ${hygiene}%. Acción reciente: ${action || 'consulta rápida'}. Dame 1 consejo ultra corto y motivador de máximo 18 palabras como entrenador personal de Gordou.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        systemInstruction:
          'Eres la voz y coach rápido de Gordou, una mascota virtual fitness 3D estilo Pou. Responde siempre en español, muy breve (máximo 18 palabras), sin comillas ni markdown.',
      },
    });

    return res.json({
      tip: response.text?.trim() || '¡Sigue entrenando duro, cada gramo menos cuenta hacia los 65 kg!',
      model: 'gemini-3.1-flash-lite',
    });
  } catch (error: any) {
    return res.status(200).json({
      tip: '¡Gran ritmo! Combina verdura fresca con Cardio Cuerda para bajar rápido a 65 kg.',
      error: error?.message || 'Fallback tip',
    });
  }
});

// 2. Multi-turn Gemini Chatbot using gemini-3.8-flash
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, stats } = req.body || {};
    const ai = getAiClient();

    const weightStr = Number(stats?.weight ?? 110).toFixed(1);
    const systemPrompt = `Eres "Coach Fit Pou", el entrenador personal y nutricionista dentro del juego móvil 3D "Gordou".
Estado actual de Gordou:
- Peso actual: ${weightStr} kg (Meta saludable: 65.0 kg)
- Hambre: ${stats?.hunger ?? 80}%
- Salud: ${stats?.health ?? 85}%
- Energía: ${stats?.energy ?? 90}%
- Higiene/Felicidad: ${stats?.hygiene ?? 85}%
- Monedas (FitCoins): ${stats?.coins ?? 120}
- Nivel: ${stats?.level ?? 1}

Tu objetivo es aconsejar al jugador de forma simpática, motivadora y breve (2 a 3 frases máximo) sobre qué darle de comer en la Cocina (Manzana, Brócoli, Pechuga, Batido verde o Agua queman entre -0.3 y -0.8 kg; evitar Hamburguesa, Pizza, Dona o Refresco porque suben hasta +1.5 kg), cuándo bañarlo con jabón y ducha, cuándo apagar la lámpara del dormitorio, o qué minijuego 3D jugar (Gordou Runner 3D, Atrapa lo Sano 3D, Cardio Cuerda 3D, Sprint en Caminadora). Responde en español natural sin listas largas.`;

    if (!ai) {
      const lastUserMsg = Array.isArray(messages) && messages.length > 0
        ? messages[messages.length - 1]?.text || ''
        : '';
      return res.json({
        reply: `¡Hola campeón! Con Gordou en ${weightStr} kg, te recomiendo darle Pechuga o Batido Verde en la Cocina y jugar una ronda de Cardio Cuerda 3D para acercarnos a los 65.0 kg. ${lastUserMsg ? '¡Vamos a lograrlo juntos!' : ''}`,
        model: 'gemini-3.8-flash',
      });
    }

    const historyContents = Array.isArray(messages)
      ? messages.map((m: { role: string; text: string }) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(m.text || '') }],
        }))
      : [{ role: 'user', parts: [{ text: 'Hola Coach, ¿cómo bajamos a 65 kg?' }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: historyContents,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return res.json({
      reply:
        response.text?.trim() ||
        `¡Vamos por buen camino! En ${weightStr} kg, aliméntalo con Brócoli y entrena en el Gimnasio 3D.`,
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    return res.status(200).json({
      reply:
        '¡No te rindas! Alimenta a Gordou con comida saludable en la Cocina y juega Gordou Runner 3D para quemar calorías y ganar FitCoins.',
      error: error?.message,
    });
  }
});

// 3. Audio Transcription using gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, weight } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        transcript: '¡Hola Gordou, vamos a entrenar para llegar a 65 kilos!',
        reaction: '¡Siii! ¡Escuché tu voz y tengo muchas ganas de saltar la cuerda!',
        model: 'gemini-3.5-transcribe',
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const transcribeResp = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe este audio exactamente en español. Si no hay voz clara, escribe una frase corta alegre.' },
        ],
      },
    });

    const transcript = transcribeResp.text?.trim() || '¡Vamos Gordou, tú puedes!';

    // Also get a fast low-latency reply from gemini-3.1-flash-lite
    let reaction = `¡Jajaja! Repetí: "${transcript}"`;
    try {
      const quickResp = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `El usuario dijo: "${transcript}". Gordou pesa ${Number(weight || 110).toFixed(1)} kg. Responde como Gordou en 1 frase corta y graciosa (máximo 14 palabras).`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      if (quickResp.text) {
        reaction = quickResp.text.trim();
      }
    } catch {
      // ignore secondary error
    }

    return res.json({
      transcript,
      reaction,
      model: 'gemini-3.5-transcribe',
    });
  } catch (error: any) {
    return res.status(200).json({
      transcript: '¡Vamos a entrenar duro hoy!',
      reaction: '¡Jajaja, me hace cosquillas repetir tu voz!',
      error: error?.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gordou 3D server running on http://localhost:${PORT}`);
  });
}

startServer();
