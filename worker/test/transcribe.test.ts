/* Ejecutar: npm test (en la carpeta worker). Usa una IA simulada y SQLite en memoria: no llama a Workers AI ni gasta cuota. */
import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.ts";
import { onRequest } from "../../functions/transcribe.ts";
import { cleanTranscript, toBase64, WHISPER, MAX_AUDIO_BYTES } from "../src/transcribe.ts";
import { sqliteDb } from "./sqlite.ts";

/* Un audio de mentira con el tamaño de una frase corta. */
const clip = (n = 20_000) => new Uint8Array(n).fill(7);

function audioReq(body: Uint8Array | string = clip(), init: { type?: string | null; ip?: string; origin?: string; method?: string } = {}): Request {
  const headers: Record<string, string> = { "CF-Connecting-IP": init.ip ?? "203.0.113.7" };
  if (init.type !== null) headers["Content-Type"] = init.type ?? "audio/webm;codecs=opus";
  if (init.origin) headers.Origin = init.origin;
  return new Request("https://chaski.example/transcribe", { method: init.method ?? "POST", headers, body: init.method === "OPTIONS" || init.method === "GET" ? undefined : body });
}

/* IA simulada: guarda cada llamada y responde lo que se le pida. */
function fakeAi(reply: unknown = { text: "Si compro el doble pago el doble" }, fail?: unknown) {
  const calls: { model: string; input: Record<string, unknown> }[] = [];
  return {
    calls,
    ai: { run: async (model: string, input: Record<string, unknown>) => { calls.push({ model, input }); if (fail) throw fail; return reply; } },
  };
}

test("transcribe el audio con Whisper en español y devuelve el texto", async () => {
  const f = fakeAi();
  const res = await handle(audioReq(), { AI: f.ai });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { text: "Si compro el doble pago el doble" });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].model, WHISPER);
  const input = f.calls[0].input;
  assert.equal(input.language, "es");
  assert.equal(input.task, "transcribe");
  assert.equal(input.vad_filter, true, "sin voz no debe inventar texto");
  assert.equal(input.condition_on_previous_text, false);
  assert.equal(typeof input.audio, "string", "el audio va en base64");
  assert.equal(input.audio, toBase64(clip()));
});

test("acepta los formatos que graba cada navegador (WebM de Chrome y Android, MP4 de Safari)", async () => {
  for (const type of ["audio/webm", "audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]) {
    const f = fakeAi();
    assert.equal((await handle(audioReq(clip(), { type }), { AI: f.ai })).status, 200, type);
    assert.equal(f.calls.length, 1, type);
  }
});

test("rechaza lo que no es audio sin gastar cuota", async () => {
  const f = fakeAi();
  for (const type of ["application/json", "text/plain", null]) {
    assert.equal((await handle(audioReq(clip(), { type }), { AI: f.ai })).status, 415, String(type));
  }
  assert.equal(f.calls.length, 0);
});

test("un audio demasiado grande se rechaza antes de llamar a la IA", async () => {
  const f = fakeAi();
  const res = await handle(audioReq(clip(MAX_AUDIO_BYTES + 1)), { AI: f.ai });
  assert.equal(res.status, 413);
  assert.equal(f.calls.length, 0);
});

test("un toque al botón (audio casi vacío) devuelve texto vacío y no llama a la IA", async () => {
  const f = fakeAi();
  const res = await handle(audioReq(clip(200)), { AI: f.ai });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { text: "" });
  assert.equal(f.calls.length, 0);
});

test("sin el enlace de IA responde 501 y el juego sigue con la tablilla", async () => {
  const res = await handle(audioReq(), {});
  assert.equal(res.status, 501);
  assert.match(((await res.json()) as any).error, /no está disponible/);
});

test("si Whisper falla, el error no muestra detalles ni el audio", async () => {
  const f = fakeAi(null, new Error("AiError: cuota agotada"));
  const res = await handle(audioReq(), { AI: f.ai });
  assert.equal(res.status, 502);
  const body = JSON.stringify(await res.json());
  assert.ok(!body.includes("cuota"), "el detalle va al registro del servidor, no al navegador");
});

test("frases que Whisper inventa sobre el silencio no llegan al estudiante", async () => {
  for (const phantom of ["Subtítulos realizados por la comunidad de Amara.org", "Gracias por ver el video", "Gracias.", "...", "¡Suscríbete!"]) {
    const res = await handle(audioReq(), { AI: fakeAi({ text: phantom }).ai });
    assert.deepEqual(await res.json(), { text: "" }, phantom);
  }
});

test("cleanTranscript conserva lo dicho de verdad, aunque contenga 'gracias'", () => {
  assert.equal(cleanTranscript("  Gracias a eso, 4 panes cuestan 8 soles  "), "Gracias a eso, 4 panes cuestan 8 soles");
  assert.equal(cleanTranscript("el 20 %\n de descuento"), "el 20 % de descuento");
  assert.equal(cleanTranscript(undefined), "");
  assert.equal(cleanTranscript(42), "");
});

test("toBase64 no desborda con audios grandes y se puede revertir", () => {
  const big = Uint8Array.from({ length: 300_000 }, (_, i) => i % 251);
  const back = Uint8Array.from(atob(toBase64(big)), (c) => c.charCodeAt(0));
  assert.equal(back.length, big.length);
  assert.ok(back.every((v, i) => v === big[i]));
});

test("respeta ALLOWED_ORIGINS: un origen ajeno recibe 403 y no gasta cuota", async () => {
  const f = fakeAi();
  const env = { AI: f.ai, ALLOWED_ORIGINS: "https://chaski.pages.dev" };
  assert.equal((await handle(audioReq(clip(), { origin: "https://malo.example" }), env)).status, 403);
  assert.equal((await handle(audioReq(clip(), { origin: "https://chaski.pages.dev" }), env)).status, 200);
  assert.equal(f.calls.length, 1);
  const pre = await handle(audioReq(clip(), { method: "OPTIONS", origin: "https://chaski.pages.dev" }), env);
  assert.equal(pre.status, 204, "la solicitud previa de CORS pasa sin llamar a la IA");
});

test("una misma IP no pasa del tope en 10 minutos y la IA no se llama de más", async () => {
  const { db } = sqliteDb(), f = fakeAi();
  const env = { AI: f.ai, DB: db, RATE_LIMIT_TRANSCRIBE: "2" };
  for (let i = 0; i < 2; i++) assert.equal((await handle(audioReq(), env)).status, 200);
  const blocked = await handle(audioReq(), env);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
  assert.equal(f.calls.length, 2);
  assert.equal((await handle(audioReq(clip(), { ip: "198.51.100.9" }), env)).status, 200, "otra IP sigue pasando");
});

test("el tope diario de dictados suma todas las IP y cuida la cuota gratis", async () => {
  const { db } = sqliteDb(), f = fakeAi();
  const env = { AI: f.ai, DB: db, DAILY_TRANSCRIBE: "2" };
  assert.equal((await handle(audioReq(clip(), { ip: "203.0.113.1" }), env)).status, 200);
  assert.equal((await handle(audioReq(clip(), { ip: "203.0.113.2" }), env)).status, 200);
  const res = await handle(audioReq(clip(), { ip: "203.0.113.3" }), env);
  assert.equal(res.status, 429);
  assert.match(((await res.json()) as any).error, /tope diario de dictados/);
  assert.equal(f.calls.length, 2);
});

test("los dictados no gastan el tope diario de lecturas con el modelo", async () => {
  const { db } = sqliteDb(), f = fakeAi();
  const env = { AI: f.ai, DB: db, DAILY_MODEL_CALLS: "1" };
  for (let i = 0; i < 3; i++) assert.equal((await handle(audioReq(), env)).status, 200);
});

test("la función de Pages responde en /transcribe", async () => {
  const f = fakeAi();
  const res = await onRequest({ request: audioReq(), env: { AI: f.ai } });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as any).text, "Si compro el doble pago el doble");
});

test("/extract sigue igual: /transcribe no lo afecta y un GET a /transcribe no existe", async () => {
  assert.equal((await handle(audioReq("", { method: "GET" }), { AI: fakeAi().ai })).status, 404);
});
