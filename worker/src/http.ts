/* Piezas HTTP comunes a las rutas del servidor: cabeceras CORS y respuestas JSON. */

export interface CorsEnv {
  ALLOWED_ORIGINS?: string;
}

/** Cabeceras CORS según `ALLOWED_ORIGINS` (lista separada por comas; `*` acepta cualquiera). */
export function corsHeaders(req: Request, env: CorsEnv): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Panel-Key",
    Vary: "Origin",
  };
  if (allow) h["Access-Control-Allow-Origin"] = allow;
  return h;
}

export function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
