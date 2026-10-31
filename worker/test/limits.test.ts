/* Ejecutar: npm test (en la carpeta worker). Usa SQLite en memoria y un fetch simulado: no llama a Gemini. */
import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.ts";
import { handleEvents } from "../src/events.ts";
import { checkLimits } from "../src/limits.ts";
import { sqliteDb } from "./sqlite.ts";

const GOOD = "Si compras el doble pagas el doble. Se multiplican las dos cantidades por el mismo número.";
const reply = { candidates: [{ content: { parts: [{ text: JSON.stringify({ K1: { state: "ausente", evidence: "" }, K2: { state: "ausente", evidence: "" }, K3: { state: "ausente", evidence: "" }, restatement: "Todavía no sé nada." }) }] } }] };

function counter() {
  let calls = 0;
  return { get calls() { return calls; }, fetch: async () => { calls++; return new Response(JSON.stringify(reply), { status: 200 }); } };
}
const extract = (ip = "203.0.113.7") => new Request("https://chaski.example/extract", { method: "POST", headers: { "CF-Connecting-IP": ip }, body: JSON.stringify({ text: GOOD, topic: "proporciones" }) });
const post = (ip = "203.0.113.7") => new Request("https://chaski.example/events", { method: "POST", headers: { "CF-Connecting-IP": ip }, body: JSON.stringify({ events: [{ ts: 1, type: "start", sid: "abc", alias: "Condor", cls: "3A2026", topic: "proporciones" }] }) });

test("una misma IP no pasa del tope en 10 minutos y el modelo no se llama de más", async () => {
  const { db } = sqliteDb(), m = counter();
  const env = { GEMINI_API_KEY: "k", DB: db, RATE_LIMIT_EXTRACT: "3" };
  for (let i = 0; i < 3; i++) assert.equal((await handle(extract(), env, { fetch: m.fetch })).status, 200);
  const blocked = await handle(extract(), env, { fetch: m.fetch });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
  assert.equal(m.calls, 3, "Gemini no se llama cuando se frena");
  assert.equal((await handle(extract("198.51.100.9"), env, { fetch: m.fetch })).status, 200, "otra IP sigue pasando");
});

test("el tope diario suma todas las IP y frena antes de gastar más cuota", async () => {
  const { db } = sqliteDb(), m = counter();
  const env = { GEMINI_API_KEY: "k", DB: db, DAILY_MODEL_CALLS: "2" };
  assert.equal((await handle(extract("203.0.113.1"), env, { fetch: m.fetch })).status, 200);
  assert.equal((await handle(extract("203.0.113.2"), env, { fetch: m.fetch })).status, 200);
  const res = await handle(extract("203.0.113.3"), env, { fetch: m.fetch });
  assert.equal(res.status, 429);
  assert.match(((await res.json()) as any).error, /tope diario/);
  assert.equal(m.calls, 2);
});

test("la IP nunca se guarda: solo una huella corta que caduca", async () => {
  const { db, raw } = sqliteDb();
  await handle(extract("203.0.113.7"), { GEMINI_API_KEY: "k", DB: db }, { fetch: counter().fetch });
  const rows = raw.prepare("SELECT k, exp FROM rate").all() as { k: string; exp: number }[];
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((r) => !r.k.includes("203.0.113.7")));
  assert.ok(rows.every((r) => r.exp > Math.floor(Date.now() / 1000)));
});

test("sin base de datos no se limita nada, y si la base falla el juego sigue", async () => {
  const m = counter();
  for (let i = 0; i < 5; i++) assert.equal((await handle(extract(), { GEMINI_API_KEY: "k", RATE_LIMIT_EXTRACT: "1" }, { fetch: m.fetch })).status, 200);
  const broken: any = { prepare: () => { throw new Error("D1_ERROR"); }, batch: async () => [] };
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.equal((await handle(extract(), { GEMINI_API_KEY: "k", DB: broken }, { fetch: m.fetch })).status, 200);
  } finally {
    console.error = quiet;
  }
});

test("guardar partidas también tiene tope por IP, y leer con la clave del panel no", async () => {
  const { db } = sqliteDb();
  const env = { DB: db, PANEL_KEY: "clave-del-panel-de-prueba", RATE_LIMIT_EVENTS: "2" };
  assert.equal((await handleEvents(post(), env)).status, 200);
  assert.equal((await handleEvents(post(), env)).status, 200);
  const blocked = await handleEvents(post(), env);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("Retry-After"));
  for (let i = 0; i < 5; i++) {
    const read = new Request("https://chaski.example/events?cls=3A2026", { headers: { "X-Panel-Key": "clave-del-panel-de-prueba", "CF-Connecting-IP": "203.0.113.7" } });
    assert.equal((await handleEvents(read, env)).status, 200);
  }
});

test("los contadores vencidos se borran", async () => {
  const { db, raw } = sqliteDb();
  const real = Math.random;
  Math.random = () => 0;
  try {
    const t0 = Date.UTC(2026, 9, 31, 12, 0, 0);
    await checkLimits({ DB: db }, extract(), "extract", t0);
    assert.equal((raw.prepare("SELECT COUNT(*) AS n FROM rate").get() as any).n, 2);
    // Una hora después, otra IP abre una ventana nueva y limpia lo vencido.
    await checkLimits({ DB: db }, extract("198.51.100.9"), "extract", t0 + 3600_000);
    const keys = (raw.prepare("SELECT k FROM rate").all() as { k: string }[]).map((r) => r.k);
    assert.equal(keys.filter((k) => k.startsWith("ip:")).length, 1, "solo queda el contador de la ventana vigente");
  } finally {
    Math.random = real;
  }
});

test("los valores raros de los topes caen al valor por defecto", async () => {
  const { db } = sqliteDb(), m = counter();
  for (const bad of ["", "abc", "-5", "0", "NaN"]) {
    const env = { GEMINI_API_KEY: "k", DB: db, RATE_LIMIT_EXTRACT: bad, DAILY_MODEL_CALLS: bad };
    assert.equal((await handle(extract(bad || "x"), env, { fetch: m.fetch })).status, 200, JSON.stringify(bad));
  }
});
