/* Cloudflare Pages Function: responde en /transcribe, en el mismo sitio que el juego.
   Pasa a texto la voz del estudiante con Whisper (Workers AI). La lógica vive en worker/src/transcribe.ts.
   Pide en el proyecto de Pages: el enlace Workers AI llamado `AI` (Ajustes > Enlaces) y, para los topes de uso,
   el enlace D1 `DB`. Opcionales: RATE_LIMIT_TRANSCRIBE, DAILY_TRANSCRIBE y ALLOWED_ORIGINS. */
import { handle, type Env } from "../worker/src/index.ts";

export const onRequest = (context: { request: Request; env: Env }): Promise<Response> => handle(context.request, context.env);
