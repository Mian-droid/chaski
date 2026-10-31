# Despliegue en Cloudflare

Dos piezas, en este orden:

1. **El servidor** (Worker): lee la explicación con el modelo (Google Gemini). Lleva la clave de Gemini.
2. **El sitio** (Pages): el juego y el panel docente, como archivos estáticos.

Si solo quieres probar el juego sin el modelo, salta al paso 3 y empaqueta sin `EXTRACT_URL`: Chaski leerá con reglas de palabras.

> Estado: el servidor se empaquetó (779 KiB, 124 KiB comprimido) y su código se probó con un `fetch` simulado. **Nunca se ha desplegado** ni se ha llamado a Gemini con una clave real. Los pasos de abajo no se han ejecutado contra una cuenta.

## Qué necesitas

- Una cuenta de Cloudflare (el plan gratuito alcanza para un piloto).
- Una clave de API de Gemini, de [Google AI Studio](https://aistudio.google.com/apikey). Si usas un plan de pago, fija un **límite de gasto** antes de exponer el servidor. Antes de elegir plan, lee la sección *Privacidad y datos*.
- Node 22 o superior.

## 1. Servidor

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY        # pega tu clave cuando la pida
npx wrangler deploy
```

`deploy` muestra la dirección del servidor, por ejemplo `https://chaski-lector.tu-cuenta.workers.dev`. Guárdala.

## 2. Probar el servidor con el modelo real

Antes de que lo use ningún estudiante, dentro de `worker/`:

```bash
GEMINI_API_KEY=tu-clave npm run live           # tarda unos 90 s; usa tu cuota
```

En PowerShell: `$env:GEMINI_API_KEY="tu-clave"; npm run live`.

Corre explicaciones de los tres temas y dice si el modelo leyó lo esperado. Si algún caso falla, ajusta el prompt del tema en `worker/src/topics.ts` y vuelve a probar. Esta prueba **todavía no se ha corrido**.

Prueba también el servidor ya desplegado:

```bash
curl -s -X POST https://chaski-lector.tu-cuenta.workers.dev/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"Si compras el doble pagas el doble.","topic":"proporciones"}'
```

Debe responder 200 con `"source":"modelo"`.

## 3. Sitio

Desde la raíz del repositorio, con la dirección del servidor y `/extract` al final:

```bash
EXTRACT_URL=https://chaski-lector.tu-cuenta.workers.dev/extract npm run build:site
npx wrangler pages deploy dist --project-name chaski
```

- `build:site` arma `dist/` con solo el juego, el panel y las cabeceras. Deja fuera pruebas, documentos y el servidor. La dirección se escribe en `dist/`, no en el repositorio.
- La primera vez, `pages deploy` crea el proyecto. Si el nombre `chaski` ya está tomado, usa otro.
- Muestra la dirección del sitio, por ejemplo `https://chaski.pages.dev`.
- Si conectaste el repositorio de GitHub desde el panel de Cloudflare, no uses `wrangler pages deploy`: en el proyecto pon como comando de construcción `npm run build:site`, como carpeta de salida `dist` y las variables `NODE_VERSION=22` y `EXTRACT_URL`. Cada cambio en `main` se publica solo. Para que `EXTRACT_URL` surta efecto, reintenta el despliegue.

Atajo: `npm run deploy:site` hace los dos pasos, pero necesita `EXTRACT_URL` en el entorno.

**Vista previa al compartir (WhatsApp):** el juego trae favicon y una imagen con el personaje. La imagen se pide con dirección completa y `index.html` trae `https://chaski.pages.dev`. Si tu sitio tiene otra dirección, empaqueta con `SITE_URL=https://tu-dominio` (en Cloudflare, agrégala como variable de texto). Detalles y cómo probarla en [../brand/README.md](../brand/README.md).

**Para guardar los datos de varios dispositivos** agrega también `ENDPOINT=` con la dirección del Apps Script (ver [../apps-script/README.md](../apps-script/README.md)).

## 4. Cerrar el origen del servidor

Mientras `ALLOWED_ORIGINS` sea `*`, cualquier página puede gastar tu clave. En `worker/wrangler.toml` pon la dirección real del sitio (varias, separadas por coma) y vuelve a desplegar:

```toml
ALLOWED_ORIGINS = "https://chaski.pages.dev"
```

```bash
cd worker && npx wrangler deploy
```

Las vistas previas de Pages usan otras direcciones (`https://<hash>.chaski.pages.dev`). Si las usas, agrégalas o prueba solo con la dirección principal.

## 5. Verificar

1. Abre `https://chaski.pages.dev/panel.html`, elige un tema y copia el enlace para estudiantes.
2. Ábrelo en un celular y juega un tema completo.
3. Con las herramientas del navegador, pestaña Red: la petición `POST .../extract` debe dar 200. Si da error, el juego sigue funcionando con reglas de palabras, así que **un juego que funciona no prueba que el modelo esté conectado**: mira la respuesta, que debe traer `"source":"modelo"`.
4. Revisa que el servidor rechace otros orígenes: desde una página distinta, la petición debe dar 403.

## Privacidad y datos

- El enlace lleva el código de clase (`?clase=`). Las páginas no mandan el referente (`no-referrer`), así que ese código no viaja a Google Fonts.
- El texto que escribe el estudiante se envía a Google (Gemini) a través del servidor. Dilo antes de jugar y define el permiso de tutores si son menores.
- **Plan gratuito de Gemini:** según los términos de Google, lo que se envía se usa para mejorar sus productos y personas pueden leerlo (desvinculado de tu cuenta). Google pide no enviar información personal. Con el plan de pago, Google dice que no usa los datos para mejorar sus productos. Cada campo del juego ya recuerda no escribir datos personales.
- **Menores de 18 años:** los términos de la API de Gemini (consultados el 31 de octubre de 2026) piden ser mayor de 18 y no permiten usar el servicio en un cliente dirigido a menores de 18 o que probablemente lo usen. Chaski es para secundaria. Es razonable para una demostración con adultos (jurado, docentes). Para un piloto con estudiantes, confírmalo con Google o con el docente antes. Mientras tanto, el juego funciona sin modelo, con reglas de palabras: basta publicar sin `EXTRACT_URL`.
- El panel docente es una página pública. Los datos que muestra son los del dispositivo, un archivo o la hoja de Google (esta última protegida con una clave). No hay cuentas.

## Límites y costos

- Workers y Pages tienen cuotas gratuitas diarias que sobran para un piloto. Revisa los límites vigentes en tu cuenta.
- El plan gratuito de Gemini tiene un límite de solicitudes por minuto y por día; revisa los vigentes en AI Studio. Si un estudiante lo pasa, el servidor responde 503 y el juego lee con reglas de palabras.
- `MODEL` en `wrangler.toml`: `gemini-3.5-flash-lite` (por defecto) responde rápido. `gemini-3.8-flash` lee mejor pero piensa más y puede tardar más de los 12 s que espera el juego.
- El servidor no tiene limitador de uso. Con el origen cerrado el riesgo es bajo, pero existe.

## Deshacer

```bash
cd worker && npx wrangler delete                       # quita el servidor
npx wrangler pages project delete chaski               # quita el sitio
```

Y borra la clave de Gemini en AI Studio si ya no la necesitas.
