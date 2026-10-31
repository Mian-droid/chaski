/* Servidor intermedio de Chaski (Cloudflare Worker).
   POST /extract  { text, topic? }  ->  { cards: {K1,K2,K3}, restatement, source: "modelo" }
   La clave de Anthropic vive solo aquí, como secreto. Nunca va en la página. */
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, buildParams, sanitize } from "./extract.ts";
import { isTopic } from "./topics.ts";

export interface Env {
  ANTHROPIC_API_KEY?: string;
  MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

/* Lo mínimo que se usa del cliente, para poder probar con uno simulado. */
export interface ClientLike {
  messages: { parse: (params: any) => Promise<any> };
}

const MIN_TEXT = 8;
const MAX_TEXT = 800;

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

export async function handle(req: Request, env: Env, deps: { client?: ClientLike } = {}): Promise<Response> {
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

  if (!deps.client && !env.ANTHROPIC_API_KEY) return json({ error: "el servidor no tiene clave configurada" }, 500, h);
  const client: ClientLike =
    deps.client ?? (new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 }) as unknown as ClientLike);

  try {
    const res = await client.messages.parse(buildParams(text, env.MODEL || DEFAULT_MODEL, topic));
    if (res.stop_reason === "refusal") return json({ error: "el modelo no respondió" }, 502, h);
    if (!res.parsed_output) return json({ error: "respuesta sin formato" }, 502, h);
    return json(sanitize(res.parsed_output, text), 200, h);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "demasiadas solicitudes, intenta de nuevo" }, 503, h);
    if (e instanceof Anthropic.APIConnectionError) return json({ error: "sin conexión con el modelo" }, 502, h);
    if (e instanceof Anthropic.APIError) return json({ error: "error del modelo" }, 502, h);
    return json({ error: "error interno" }, 500, h);
  }
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handle(req, env);
  },
};
