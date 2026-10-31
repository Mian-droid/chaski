/* Servidor intermedio de Chaski (Cloudflare Worker).
   POST /extract  { text, topic? }  ->  { cards: {K1,K2,K3}, restatement, source: "modelo" }
   La clave de Gemini vive solo aquí, como secreto. Nunca va en la página. */
import { DEFAULT_MODEL, buildRequest, parseReply, sanitize } from "./extract.ts";
import { isTopic } from "./topics.ts";

export interface Env {
  GEMINI_API_KEY?: string;
  MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

/* Lo mínimo que se usa de `fetch`, para poder probar con uno simulado. */
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MIN_TEXT = 8;
const MAX_TEXT = 800;
/* Menos que los 12 s que espera el juego: si Gemini tarda, el juego lee con reglas de palabras. */
const TIMEOUT_MS = 10_000;

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (allow) h["Access-Control-Allow-Origin"] = allow;
  return h;
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

/* El modelo va en la dirección de la llamada: solo se aceptan nombres con forma de modelo. */
function modelName(env: Env): string {
  const m = (env.MODEL ?? "").trim();
  return /^[a-z0-9][a-z0-9.-]*$/.test(m) ? m : DEFAULT_MODEL;
}

export async function handle(req: Request, env: Env, deps: { fetch?: Fetcher } = {}): Promise<Response> {
  const h = corsHeaders(req, env);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  const url = new URL(req.url);
  if (req.method !== "POST" || url.pathname !== "/extract") return json({ error: "no existe" }, 404, h);
  if (!h["Access-Control-Allow-Origin"]) return json({ error: "origen no permitido" }, 403, h);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400, h);
  }
  const fields = (body ?? {}) as { text?: unknown; topic?: unknown };
  const text = typeof fields.text === "string" ? fields.text.trim() : "";
  const topic = fields.topic ?? "proporciones";
  if (!isTopic(topic)) return json({ error: "tema desconocido" }, 400, h);
  if (text.length < MIN_TEXT || text.length > MAX_TEXT) {
    return json({ error: `el texto debe tener entre ${MIN_TEXT} y ${MAX_TEXT} caracteres` }, 400, h);
  }

  if (!env.GEMINI_API_KEY) return json({ error: "el servidor no tiene clave configurada" }, 500, h);
  const call: Fetcher = deps.fetch ?? ((u, i) => fetch(u, i));

  let upstream: Response;
  try {
    upstream = await call(`${API}/${modelName(env)}:generateContent`, {
      method: "POST",
      // La clave va en la cabecera y no en la dirección, para que no quede en registros.
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(buildRequest(text, topic)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return json({ error: "sin conexión con el modelo" }, 502, h);
  }

  if (!upstream.ok) {
    // El detalle va al registro del servidor, nunca al navegador. No incluye el texto del estudiante.
    console.error("gemini", upstream.status, (await upstream.text().catch(() => "")).slice(0, 300));
    if (upstream.status === 429) return json({ error: "demasiadas solicitudes, intenta de nuevo" }, 503, h);
    return json({ error: "error del modelo" }, 502, h);
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return json({ error: "respuesta sin formato" }, 502, h);
  }
  const parsed = parseReply(data);
  if (!parsed.ok) return json({ error: parsed.why === "blocked" ? "el modelo no respondió" : "respuesta sin formato" }, 502, h);
  return json(sanitize(parsed.value, text), 200, h);
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handle(req, env);
  },
};
