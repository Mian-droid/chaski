/* Dictado por voz: pasa a texto lo que el estudiante dice.
   POST /transcribe  (cuerpo = el audio tal como lo grabó el navegador, Content-Type audio/*)  ->  { text }
   Usa Whisper en Workers AI (enlace `AI`). No hace falta ninguna clave y el audio no se guarda en ningún lado:
   viaja en la solicitud, se transcribe y se descarta. Solo se cuenta la solicitud (tope por IP y tope diario).
   El texto vuelve a la tablilla del estudiante, que lo revisa y lo edita antes de enviarlo. */
import { json } from "./http.ts";
import { checkLimits, type LimitsEnv } from "./limits.ts";

/** Lo mínimo que se usa del enlace `AI`, para poder probar con uno simulado. */
export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}
export interface TranscribeEnv extends LimitsEnv {
  AI?: AiBinding;
}

export const WHISPER = "@cf/openai/whisper-large-v3-turbo";
/* Un minuto de voz en WebM/Opus pesa unos 0,5 MB y en MP4/AAC cerca de 1 MB: 2 MB sobra y frena archivos enormes. */
export const MAX_AUDIO_BYTES = 2_000_000;
/* Menos que esto no es una frase: es un toque al botón. */
export const MIN_AUDIO_BYTES = 1_000;
const TIMEOUT_MS = 25_000;
const AUDIO_TYPE = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|aac|x-m4a|m4a|flac)\s*(;.*)?$/i;

/** Frases que Whisper inventa sobre el silencio o el ruido. Si el resultado es solo eso, se descarta. */
const PHANTOM = [
  /amara\.org/i,
  /subt[ií]tulos?\s+(realizados?|por|de)/i,
  /gracias\s+por\s+(ver|mirar|escuchar)/i,
  /suscr[ií]be?te/i,
  /^[\s.…¡!¿?,-]*(gracias|muchas gracias|adi[oó]s|chao)?[\s.…¡!¿?,-]*$/i,
];

/** Limpia lo que devolvió el modelo; vacío si no hubo voz o fue una frase inventada. */
export function cleanTranscript(raw: unknown): string {
  const text = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  return PHANTOM.some((re) => re.test(text)) ? "" : text;
}

/** Base64 de unos bytes, por tramos para no desbordar la pila con audios largos. */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function handleTranscribe(req: Request, env: TranscribeEnv, h: Record<string, string>): Promise<Response> {
  if (!AUDIO_TYPE.test(req.headers.get("Content-Type") ?? "")) return json({ error: "se esperaba un audio" }, 415, h);
  const declared = Number(req.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) return json({ error: "el audio es muy largo" }, 413, h);
  if (!env.AI) return json({ error: "la voz no está disponible en este servidor" }, 501, h);

  const lim = await checkLimits(env, req, "transcribe");
  if (!lim.ok) return json({ error: lim.error }, 429, { ...h, "Retry-After": String(lim.retryAfter) });

  const audio = new Uint8Array(await req.arrayBuffer());
  if (audio.length > MAX_AUDIO_BYTES) return json({ error: "el audio es muy largo" }, 413, h);
  if (audio.length < MIN_AUDIO_BYTES) return json({ text: "" }, 200, h);

  let result: unknown;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    result = await Promise.race([
      env.AI.run(WHISPER, {
        audio: toBase64(audio),
        task: "transcribe",
        language: "es",
        // Sin voz que transcribir, que no invente texto; y que un error no se arrastre a la frase siguiente.
        vad_filter: true,
        condition_on_previous_text: false,
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("plazo agotado")), TIMEOUT_MS); }),
    ]);
  } catch (e) {
    // Solo el tipo de fallo va al registro, nunca el audio ni el texto.
    console.error("whisper", (e as Error)?.message?.slice(0, 200) ?? "error");
    return json({ error: "no se pudo pasar la voz a texto" }, 502, h);
  } finally {
    clearTimeout(timer);
  }
  return json({ text: cleanTranscript((result as { text?: unknown } | null)?.text) }, 200, h);
}
