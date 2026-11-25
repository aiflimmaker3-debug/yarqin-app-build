import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AiAction = 'summarize' | 'proofread' | 'suggest_links' | 'expand' | 'ask';

interface AiRequestBody {
  action: AiAction;
  noteTitle: string;
  noteContent: string;
  vaultTitles?: string[];
  question?: string;
}

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

function buildPrompts(body: AiRequestBody): { systemInstruction: string; prompt: string } {
  const { action, noteTitle, noteContent, vaultTitles = [], question = '' } = body;

  const baseSystem =
    'سەن «تەپەككۇر بۇلىقى» ناملىق ئۇيغۇرچە شەخسىي بىلىم ۋە خاتىرە باشقۇرۇش سىستېمىسىنىڭ كەسپىي ئۇيغۇرچە ياردەمچىسى. ' +
    'جاۋابىڭنى ساپ، راۋان، ئۆلچەملىك ئۇيغۇر ئىملاسىدا ۋە پاكىز Markdown فورماتىدا بەر. ' +
    'خاتىرىدىكى [[ئۇلانما]] ۋە #خەتكۈچ قۇرۇلمىلىرىغا ھۆرمەت قىل. ئارتۇقچە سالام ياكى ئەسكەرتىش قوشماي بىۋاسىتە پايدىلىق نەتىجىنى بەر.';

  const safeContent = noteContent.trim() || '(بۇ خاتىرە ھازىرچە قۇرۇق)';

  switch (action) {
    case 'summarize':
      return {
        systemInstruction: baseSystem,
        prompt:
          `تۆۋەندىكى ئۇيغۇرچە خاتىرىنى ئېنىق، قىسقا ۋە قۇرۇلمىلىق قىلىپ خۇلاسىلەپ بەر.\n` +
          `قۇرۇلمىسى:\n` +
          `### يادرولۇق خۇلاسە\n(2-3 جۈملە)\n\n` +
          `### ئاساسلىق نۇقتىلار\n- (نۇقتىلار تىزىملىكى)\n\n` +
          `### كېيىنكى قەدەم ياكى ئويلىنىش\n- (1-2 تەكلىپ)\n\n` +
          `خاتىرە نامى: ${noteTitle}\n` +
          `خاتىرە مەزمۇنى:\n${safeContent}`,
      };

    case 'proofread':
      return {
        systemInstruction: baseSystem,
        prompt:
          `تۆۋەندىكى خاتىرىنىڭ ئۇيغۇرچە ئىملاسى، تىنىش بەلگىلىرى ۋە جۈملە راۋانلىقىنى تۈزىتىپ، Markdown فورماتىنى تېخىمۇ رەتلىك قىلىپ قايتا يېزىپ بەر. ` +
          `ئەسلى مەنىنى ۋە بارلىق [[ئۇلانما]] ھەم #خەتكۈچ لەرنى ساقلاپ قال. پەقەت تۈزىتىلگەن تولۇق خاتىرە مەزمۇنىنىلا قايتۇر.\n\n` +
          `خاتىرە نامى: ${noteTitle}\n` +
          `خاتىرە مەزمۇنى:\n${safeContent}`,
      };

    case 'suggest_links': {
      const otherTitles = vaultTitles
        .filter((t) => t !== noteTitle)
        .slice(0, 60)
        .map((t) => `- [[${t}]]`)
        .join('\n');
      return {
        systemInstruction: baseSystem,
        prompt:
          `تۆۋەندىكى خاتىرىنى تەھلىل قىلىپ:\n` +
          `1. ئامباردا مەۋجۇت بولغان خاتىرىلەردىن قايسىلىرى بىلەن باغلاشقا ماس كېلىدىغانلىقىنى (ئېنىق [[نامى]] شەكلىدە ۋە قىسقا سەۋەبى بىلەن) كۆرسەت.\n` +
          `2. كەلگۈسىدە يېڭىدىن يېزىشقا ئەرزىيدىغان 2-3 يېڭى [[تېما]] ئۇلانمىسىنى تەۋسىيە قىل.\n` +
          `3. بۇ خاتىرىگە ماس كېلىدىغان 3-5 ئۇيغۇرچە #خەتكۈچ (بوشلۇقسىز، مەسىلەن #تارىخ #بىلىم_باشقۇرۇش) تەۋسىيە قىل.\n\n` +
          `ئامباردىكى باشقا خاتىرىلەر:\n${otherTitles || '(باشقا خاتىرە يوق)'}\n\n` +
          `نۆۋەتتىكى خاتىرە نامى: ${noteTitle}\n` +
          `مەزمۇنى:\n${safeContent}`,
      };
    }

    case 'expand':
      return {
        systemInstruction: baseSystem,
        prompt:
          `تۆۋەندىكى خاتىرىدىكى ئىدىيەلەرنى تېخىمۇ چوڭقۇرلاشتۇرۇپ، تارماق ماۋزۇلار (##)، ئەمەلىي مىساللار ۋە تىزىملىكلەر بىلەن بېيىتىپ، تولۇق ۋە قۇرۇلمىلىق Markdown خاتىرىسى قىلىپ كېڭەيتىپ بەر. ` +
          `ئەسلىدىكى [[ئۇلانما]] ۋە #خەتكۈچ لەرنى ساقلاپ قال.\n\n` +
          `خاتىرە نامى: ${noteTitle}\n` +
          `خاتىرە مەزمۇنى:\n${safeContent}`,
      };

    case 'ask':
    default:
      return {
        systemInstruction: baseSystem,
        prompt:
          `تۆۋەندىكى خاتىرىنى ئاساس قىلىپ ئىشلەتكۈچىنىڭ سوئالىغا ئېنىق ۋە پايدىلىق قىلىپ ئۇيغۇرچە جاۋاب بەر.\n\n` +
          `خاتىرە نامى: ${noteTitle}\n` +
          `خاتىرە مەزمۇنى:\n${safeContent}\n\n` +
          `ئىشلەتكۈچىنىڭ سوئالى:\n${question.trim() || 'بۇ خاتىرىنى قىسقىچە چۈشەندۈرۈپ بەر.'}`,
      };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/ai', async (req, res) => {
    const body = req.body as AiRequestBody;
    if (!body || typeof body.action !== 'string') {
      res.status(400).json({ error: 'تەلەپ فورماتى توغرا ئەمەس.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'سۈنئىي ئەقىل مۇلازىمىتى ئۈچۈن GEMINI_API_KEY تەڭشەلمىگەن. Settings > Secrets بۆلىكىنى تەكشۈرۈڭ.',
      });
      return;
    }

    const { systemInstruction, prompt } = buildPrompts(body);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: 'مودېلدىن بوش جاۋاب قايتتى. قايتا سىناپ بېقىڭ.' });
        return;
      }

      res.json({ result: text });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Gemini API error:', message);

      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED') || message.includes('403')) {
        res.status(403).json({
          error: 'API ئاچقۇچىدا ھوقۇق مەسىلىسى بار. Settings > Secrets بۆلىكىدە ئاچقۇچنى تەكشۈرۈڭ.',
        });
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error: 'سۈنئىي ئەقىل چاقىرىش نورمىسى ۋاقىتلىق توشتى. سەل تۇرۇپ قايتا سىناڭ.',
        });
        return;
      }

      res.status(500).json({
        error: 'سۈنئىي ئەقىل مۇلازىمىتى بىلەن ئۇلىنىشتا خاتالىق كۆرۈلدى. تور ئۇلىنىشىڭىزنى تەكشۈرۈپ قايتا سىناڭ.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tepekkur Buliqi server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
