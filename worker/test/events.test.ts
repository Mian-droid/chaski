/* Ejecutar: npm test (en la carpeta worker). Usa una base D1 simulada en memoria: no toca ninguna base real. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleEvents, INSERT, type Db } from "../src/events.ts";
import { onRequest } from "../../functions/events.ts";

const KEY = "clave-del-panel-de-prueba";

/** Base simulada: entiende solo las tres sentencias que usa el servidor. */
function fakeDb() {
  const rows: Record<string, any>[] = [];
  const calls: string[] = [];
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    run: async () => {
      if (sql.includes("FROM rate")) return { meta: { changes: 0 } };
      calls.push(sql);
      if (sql.startsWith("INSERT OR IGNORE")) {
        const [eid, ts, cls, alias, topic, sid, type, data] = args as any[];
        if (!rows.some((r) => r.eid === eid)) rows.push({ eid, ts, cls, alias, topic, sid, type, data });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("DELETE FROM events WHERE cls")) {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].cls === args[0]) rows.splice(i, 1);
        return { meta: { changes: before - rows.length } };
      }
      throw new Error("sentencia no esperada: " + sql);
    },
    all: async () => {
      if (sql.includes("INTO rate")) return { results: [{ n: 1 }] }; // los contadores de límite no son parte de lo que se prueba aquí
      calls.push(sql);
      assert.match(sql, /^SELECT data FROM events WHERE cls = \?/);
      return { results: rows.filter((r) => r.cls === args[0]).sort((a, b) => a.ts - b.ts).map((r) => ({ data: r.data })) };
    },
  });
  const db: Db = {
    prepare: (sql: string) => stmt(sql) as any,
    batch: async (list: any[]) => { for (const s of list) await s.run(); return []; },
  };
  return { db, rows, calls };
}

const ev = (over: Record<string, unknown> = {}) => ({ ts: 1760000000000, type: "teach", sid: "abc123", alias: "Condor12", cls: "3a2026", topic: "porcentajes", k: "t1", text: "Una explicación", ...over });

function post(events: unknown, init: { origin?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "text/plain;charset=utf-8" };
  if (init.origin) headers.Origin = init.origin;
  return new Request("https://chaski.example/events", { method: "POST", headers, body: init.raw ?? JSON.stringify({ events }) });
}
function panel(method: "GET" | "DELETE", cls: string, key: string | null = KEY, origin?: string) {
  const headers: Record<string, string> = {};
  if (key !== null) headers["X-Panel-Key"] = key;
  if (origin) headers.Origin = origin;
  return new Request(`https://chaski.example/events?cls=${cls}`, { method, headers });
}
const env = (db: Db, extra: Record<string, unknown> = {}) => ({ DB: db, PANEL_KEY: KEY, ...extra });

test("guarda los eventos de una partida y los devuelve al panel, con la clase en mayúsculas", async () => {
  const { db, rows } = fakeDb();
  const res = await handleEvents(post([ev(), ev({ type: "ex", ex: "p1", k: undefined, ts: 1760000001000 })]), env(db));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, saved: 2, skipped: 0 });
  assert.equal(rows[0].cls, "3A2026");
  const got: any = await (await handleEvents(panel("GET", "3A2026"), env(db))).json();
  assert.equal(got.events.length, 2);
  assert.equal(got.events[0].text, "Una explicación");
  assert.equal(got.events[0].cls, "3A2026");
});

test("un evento enviado dos veces se guarda una sola vez", async () => {
  const { db, rows } = fakeDb();
  await handleEvents(post([ev()]), env(db));
  await handleEvents(post([ev()]), env(db));
  assert.equal(rows.length, 1);
});

test("descarta los eventos con forma rara y avisa cuántos", async () => {
  const { db, rows } = fakeDb();
  const bad = [null, 5, ev({ type: "otro" }), ev({ sid: "con espacios" }), ev({ alias: "x".repeat(17) }), ev({ cls: "AB" }), ev({ topic: "geometria" }), ev({ ts: "ayer" }), ev({ text: "x".repeat(25_000) })];
  const res = await handleEvents(post([ev(), ...bad]), env(db));
  assert.deepEqual(await res.json(), { ok: true, saved: 1, skipped: bad.length });
  assert.equal(rows.length, 1);
  assert.equal((await handleEvents(post(bad), env(db))).status, 400, "si ninguno sirve, responde 400");
});

test("rechaza cuerpos inválidos, vacíos o demasiado grandes sin tocar la base", async () => {
  const { db, calls } = fakeDb();
  assert.equal((await handleEvents(post(null, { raw: "{no es json" }), env(db))).status, 400);
  assert.equal((await handleEvents(post([]), env(db))).status, 400);
  assert.equal((await handleEvents(post(null, { raw: JSON.stringify({ otro: 1 }) }), env(db))).status, 400);
  assert.equal((await handleEvents(post(Array.from({ length: 101 }, () => ev())), env(db))).status, 413);
  assert.equal((await handleEvents(post(null, { raw: "x".repeat(200_001) }), env(db))).status, 413);
  assert.equal(calls.length, 0);
});

test("leer y borrar exigen la clave del panel", async () => {
  const { db, rows } = fakeDb();
  await handleEvents(post([ev()]), env(db));
  assert.equal((await handleEvents(panel("GET", "3A2026", null), env(db))).status, 401);
  assert.equal((await handleEvents(panel("GET", "3A2026", "otra-clave"), env(db))).status, 401);
  assert.equal((await handleEvents(panel("DELETE", "3A2026", "otra-clave"), env(db))).status, 401);
  assert.equal(rows.length, 1);
  // Sin PANEL_KEY definida no se puede leer ni con una clave vacía.
  assert.equal((await handleEvents(panel("GET", "3A2026", ""), { DB: db })).status, 503);
});

test("la clave nunca viaja en la dirección: una clave en ?key= no sirve", async () => {
  const { db } = fakeDb();
  const r = new Request(`https://chaski.example/events?cls=3A2026&key=${KEY}`);
  assert.equal((await handleEvents(r, env(db))).status, 401);
});

test("el panel puede borrar los datos de una clase y solo de esa", async () => {
  const { db, rows } = fakeDb();
  await handleEvents(post([ev(), ev({ ts: 1760000002000 })]), env(db));
  await handleEvents(post([ev({ cls: "4B2026", sid: "zzz999" })]), env(db));
  const res: any = await (await handleEvents(panel("DELETE", "3a2026"), env(db))).json();
  assert.equal(res.deleted, 2);
  assert.deepEqual(rows.map((r) => r.cls), ["4B2026"]);
  assert.equal((await handleEvents(panel("GET", "AB", KEY), env(db))).status, 400, "pide un código de clase válido");
});

test("guardar y borrar solo se aceptan de la página del juego cuando ALLOWED_ORIGINS está cerrado", async () => {
  const { db, rows } = fakeDb();
  const closed = env(db, { ALLOWED_ORIGINS: "https://chaski.example" });
  assert.equal((await handleEvents(post([ev()], { origin: "https://otro.example" }), closed)).status, 403);
  assert.equal((await handleEvents(post([ev()]), closed)).status, 403, "sin Origin tampoco");
  assert.equal(rows.length, 0);
  assert.equal((await handleEvents(post([ev()], { origin: "https://chaski.example" }), closed)).status, 200);
  assert.equal((await handleEvents(panel("DELETE", "3A2026", KEY, "https://otro.example"), closed)).status, 403);
  // Leer no lleva Origin cuando es del mismo sitio; lo protege la clave.
  assert.equal((await handleEvents(panel("GET", "3A2026"), closed)).status, 200);
});

test("sin base de datos enlazada responde 503 y un método o ruta distintos, 404", async () => {
  assert.equal((await handleEvents(post([ev()]), {})).status, 503);
  const { db } = fakeDb();
  assert.equal((await handleEvents(new Request("https://chaski.example/otra", { method: "POST" }), env(db))).status, 404);
  assert.equal((await handleEvents(new Request("https://chaski.example/events", { method: "PUT" }), env(db))).status, 404);
  assert.equal((await handleEvents(new Request("https://chaski.example/events", { method: "OPTIONS" }), env(db))).status, 204);
});

test("un fallo de la base no revienta ni filtra detalles", async () => {
  const broken: Db = { prepare: () => { throw new Error("D1_ERROR: secreto interno"); }, batch: async () => { throw new Error("D1_ERROR: secreto interno"); } };
  const quiet = console.error;
  console.error = () => {};
  try {
    const res = await handleEvents(post([ev()]), env(broken));
    assert.equal(res.status, 500);
    assert.ok(!(await res.text()).includes("secreto interno"));
  } finally {
    console.error = quiet;
  }
});

test("la función de Pages (functions/events.ts) responde igual que el servidor", async () => {
  const { db } = fakeDb();
  const res = await onRequest({ request: post([ev()]), env: env(db) });
  assert.equal(res.status, 200);
  const got: any = await (await onRequest({ request: panel("GET", "3A2026"), env: env(db) })).json();
  assert.equal(got.events.length, 1);
});

test("db/schema.sql se ejecuta en SQLite aunque se pegue en una sola línea, y encaja con lo que inserta el servidor", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const sql = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");
  // La consola de D1 junta lo pegado en una línea: un comentario con -- taparía todo lo que sigue.
  assert.ok(!sql.includes("--"), "el esquema no debe llevar comentarios");
  const oneLine = sql.replace(/\s+/g, " ").trim();
  const mem = new DatabaseSync(":memory:");
  mem.exec(oneLine);
  mem.exec(oneLine); // se puede ejecutar dos veces sin error
  const row = ["sid1|1760000000000|teach|t1", 1760000000000, "3A2026", "Condor12", "proporciones", "sid1", "teach", "{}"];
  mem.prepare(INSERT).run(...(row as any[]));
  mem.prepare(INSERT).run(...(row as any[])); // el mismo evento no se guarda dos veces
  assert.equal((mem.prepare("SELECT COUNT(*) AS n FROM events").get() as any).n, 1);
  const plan = mem.prepare("EXPLAIN QUERY PLAN SELECT data FROM events WHERE cls = ? ORDER BY ts").all("3A2026").map((r: any) => r.detail).join(" ");
  assert.match(plan, /events_by_class/, "la lectura por clase usa el índice");
});
