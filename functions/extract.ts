/* Cloudflare Pages Function: responde en /extract, en el mismo sitio que el juego.
   Es solo un adaptador: la lógica (validar, llamar a Gemini, sanear) vive en worker/src y es la misma que usa el Worker
   independiente. Así no hay que desplegar nada aparte ni configurar CORS.
   Variables del proyecto de Pages: GEMINI_API_KEY (secreto), y opcionales MODEL y ALLOWED_ORIGINS. */
import { handle, type Env } from "../worker/src/index.ts";

export const onRequest = (context: { request: Request; env: Env }): Promise<Response> => handle(context.request, context.env);
