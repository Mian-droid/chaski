/* Cloudflare Pages Function: responde en /events, en el mismo sitio que el juego.
   Guarda y lee los eventos de las partidas en la base de datos D1 enlazada como `DB`.
   La lógica vive en worker/src/events.ts. Variables del proyecto de Pages: el enlace D1 `DB`, el secreto PANEL_KEY
   y, opcional, ALLOWED_ORIGINS. */
import { handleEvents, type EventsEnv } from "../worker/src/events.ts";

export const onRequest = (context: { request: Request; env: EventsEnv }): Promise<Response> => handleEvents(context.request, context.env);
