/* Límites de uso. Frenan a quien llame de más (por ejemplo un bot) y protegen la cuota diaria del modelo.
   - Por dirección IP: un máximo de solicitudes en una ventana de 10 minutos. Un colegio entero comparte una IP,
     así que el tope es holgado: alcanza para una clase completa.
   - Diario: un máximo de lecturas con el modelo por día (UTC), sumando todas las IP.
   Los contadores viven en la tabla `rate` de la base de datos. La IP se guarda solo como una huella corta que
   caduca a los pocos minutos: nunca la dirección. Sin base de datos, o si la base falla, no se limita nada:
   un fallo del límite no debe dejar sin juego a la clase. */
import type { Db } from "./db.ts";

export interface LimitsEnv {
  DB?: Db;
  /** Solicitudes de lectura con el modelo por IP cada 10 minutos. */
  RATE_LIMIT_EXTRACT?: string;
  /** Envíos de partidas por IP cada 10 minutos. */
  RATE_LIMIT_EVENTS?: string;
  /** Lecturas con el modelo por día, en total. */
  DAILY_MODEL_CALLS?: string;
}
export type Scope = "extract" | "events";
export type Verdict = { ok: true } | { ok: false; error: string; retryAfter: number };

const WINDOW = 600;
const DEFAULTS = { extract: 150, events: 1200, daily: 3000 };

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Huella corta de la IP: sirve para contar, no para saber quién es. */
async function fingerprint(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("chaski|" + ip));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Suma uno al contador `k` (lo crea si no existe) y devuelve el total. */
async function bump(db: Db, k: string, exp: number): Promise<number> {
  const r = await db.prepare("INSERT INTO rate (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n").bind(k, exp).all();
  return Number((r.results?.[0] as { n?: number } | undefined)?.n ?? 0);
}

export async function checkLimits(env: LimitsEnv, req: Request, scope: Scope, now = Date.now()): Promise<Verdict> {
  if (!env.DB) return { ok: true };
  try {
    const sec = Math.floor(now / 1000);
    const bucket = Math.floor(sec / WINDOW);
    const limit = scope === "extract" ? num(env.RATE_LIMIT_EXTRACT, DEFAULTS.extract) : num(env.RATE_LIMIT_EVENTS, DEFAULTS.events);
    const ip = req.headers.get("CF-Connecting-IP") ?? "sin-ip";
    const n = await bump(env.DB, `ip:${scope}:${await fingerprint(ip)}:${bucket}`, (bucket + 2) * WINDOW);
    // De vez en cuando, se borran los contadores que ya caducaron.
    if (n === 1 && Math.random() < 0.05) await env.DB.prepare("DELETE FROM rate WHERE exp < ?").bind(sec).run();
    if (n > limit) return { ok: false, error: "demasiadas solicitudes, intenta de nuevo en unos minutos", retryAfter: (bucket + 1) * WINDOW - sec };
    if (scope === "extract") {
      const day = new Date(now).toISOString().slice(0, 10);
      const total = await bump(env.DB, `day:${day}`, sec + 2 * 86400);
      if (total > num(env.DAILY_MODEL_CALLS, DEFAULTS.daily)) return { ok: false, error: "se alcanzó el tope diario de lecturas con el modelo", retryAfter: 3600 };
    }
    return { ok: true };
  } catch (e) {
    console.error("limits", (e as Error)?.message);
    return { ok: true };
  }
}
