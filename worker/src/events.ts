/* Guardado de los eventos del juego en una base de datos (Cloudflare D1).
   POST   /events  { events: [...] }          -> guarda los eventos de una partida. Lo envía el juego.
   GET    /events?cls=CLASE  + X-Panel-Key    -> devuelve { events: [...] } de esa clase. Lo lee el panel docente.
   DELETE /events?cls=CLASE  + X-Panel-Key    -> borra los eventos de esa clase.
   Lo que pide el panel (leer y borrar) exige la clave PANEL_KEY; guardar no, porque lo hace el juego de cada estudiante. */
import { corsHeaders, json } from "./http.ts";
import { isTopic } from "./topics.ts";

/* Lo mínimo que se usa de D1, para poder probar con una base simulada. */
export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  run(): Promise<unknown>;
  all(): Promise<{ results?: unknown[] }>;
}
export interface Db {
  prepare(sql: string): DbStatement;
  batch(statements: DbStatement[]): Promise<unknown>;
}
export interface EventsEnv {
  DB?: Db;
  PANEL_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

const TYPES = ["start", "teach", "brain", "ex", "probe"];
const MAX_BODY = 200_000;
const MAX_BATCH = 100;
const MAX_EVENT = 20_000;
const MAX_ROWS = 20_000;
const INSERT = "INSERT OR IGNORE INTO events (eid, ts, cls, alias, topic, sid, type, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

/** Valida un evento y lo deja listo para guardar. Devuelve null si no tiene la forma esperada. */
function clean(x: any): unknown[] | null {
  if (!x || typeof x !== "object") return null;
  const { ts, type, sid, alias, cls } = x;
  const topic = x.topic ?? "proporciones";
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts < 0) return null;
  if (!TYPES.includes(type)) return null;
  if (typeof sid !== "string" || !/^[a-z0-9]{1,40}$/i.test(sid)) return null;
  if (typeof alias !== "string" || alias.length < 1 || alias.length > 16) return null;
  if (typeof cls !== "string") return null;
  const c = cls.trim().toUpperCase();
  if (c.length < 3 || c.length > 10) return null;
  if (!isTopic(topic)) return null;
  const data = JSON.stringify({ ...x, cls: c, topic });
  if (data.length > MAX_EVENT) return null;
  const k = typeof x.k === "string" ? x.k : typeof x.ex === "string" ? x.ex : "";
  return [`${sid}|${ts}|${type}|${k}`, ts, c, alias, topic, sid, type, data];
}

/** Compara claves sin cortar en la primera diferencia. */
function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handleEvents(req: Request, env: EventsEnv): Promise<Response> {
  const h = corsHeaders(req, env);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  const url = new URL(req.url);
  if (url.pathname !== "/events" || !["GET", "POST", "DELETE"].includes(req.method)) return json({ error: "no existe" }, 404, h);
  // Leer se protege con la clave; guardar y borrar, además, solo se aceptan de la página del juego.
  if (req.method !== "GET" && !h["Access-Control-Allow-Origin"]) return json({ error: "origen no permitido" }, 403, h);
  if (!env.DB) return json({ error: "la base de datos no está configurada" }, 503, h);
  const db = env.DB;

  try {
    if (req.method === "POST") {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: "cuerpo demasiado grande" }, 413, h);
      let body: any;
      try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400, h); }
      const list = Array.isArray(body?.events) ? body.events : null;
      if (!list || !list.length) return json({ error: "se esperaba { events: [...] }" }, 400, h);
      if (list.length > MAX_BATCH) return json({ error: `máximo ${MAX_BATCH} eventos por envío` }, 413, h);
      const rows = list.map(clean).filter((r: unknown[] | null): r is unknown[] => r !== null);
      if (!rows.length) return json({ error: "ningún evento es válido" }, 400, h);
      await db.batch(rows.map((r: unknown[]) => db.prepare(INSERT).bind(...r)));
      return json({ ok: true, saved: rows.length, skipped: list.length - rows.length }, 200, h);
    }

    // GET y DELETE son del panel docente.
    if (!env.PANEL_KEY) return json({ error: "no está definida la clave del panel (PANEL_KEY)" }, 503, h);
    if (!sameKey(req.headers.get("X-Panel-Key") ?? "", env.PANEL_KEY)) return json({ error: "clave incorrecta" }, 401, h);
    const cls = (url.searchParams.get("cls") ?? "").trim().toUpperCase();
    if (cls.length < 3 || cls.length > 10) return json({ error: "indica el código de clase" }, 400, h);

    if (req.method === "GET") {
      const res = await db.prepare(`SELECT data FROM events WHERE cls = ? ORDER BY ts ASC LIMIT ${MAX_ROWS}`).bind(cls).all();
      const events: unknown[] = [];
      for (const r of res.results ?? []) {
        try { events.push(JSON.parse((r as { data: string }).data)); } catch { /* fila dañada: se omite */ }
      }
      return json({ events }, 200, h);
    }

    const done = (await db.prepare("DELETE FROM events WHERE cls = ?").bind(cls).run()) as { meta?: { changes?: number } };
    return json({ ok: true, deleted: done?.meta?.changes ?? null }, 200, h);
  } catch (e) {
    console.error("events", (e as Error)?.message);
    return json({ error: "no se pudo completar la operación" }, 500, h);
  }
}
