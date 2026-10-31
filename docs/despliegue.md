# Despliegue en Cloudflare

Todo vive en **un solo proyecto de Cloudflare Pages**: el juego y el panel (archivos estáticos) y la lectura con el modelo (una *Pages Function* en [`functions/extract.ts`](../functions/extract.ts), que responde en `/extract`). No hay que desplegar un Worker aparte ni configurar CORS.

Si solo quieres probar el juego sin el modelo, no pongas la clave: Chaski leerá con reglas de palabras.

## Qué necesitas

- Una cuenta de Cloudflare (el plan gratuito alcanza para un piloto) y el repositorio en GitHub con la rama `main`.
- Una clave de API de Gemini, de [Google AI Studio](https://aistudio.google.com/apikey). Si usas un plan de pago, fija un **límite de gasto**. Antes de elegir plan, lee *Privacidad y datos*.
- Node 22 o superior para las pruebas locales.

## 1. Crear el proyecto de Pages (conectado a GitHub)

En el panel de Cloudflare: *Workers y Pages → Crear → Pages → Conectar con Git* y elige el repositorio.

| Campo | Valor |
|---|---|
| Nombre del proyecto | `chaski` (la dirección será `chaski.pages.dev`) |
| Rama de producción | `main` |
| Framework preset | `None` |
| Comando de construcción | `npm run build:site` |
| Directorio de salida | `dist` |
| Directorio raíz | vacío |

Cloudflare instala las dependencias de la raíz (`zod`) y compila la carpeta `functions/` sola. Cada cambio en `main` se publica solo.

## 2. Variables y secretos

En el proyecto: *Settings → Variables and Secrets*.

| Tipo | Nombre | Valor | Para qué |
|---|---|---|---|
| Secreto | `GEMINI_API_KEY` | tu clave | La usa la función para llamar a Gemini. Nunca va en el código ni en la página. |
| Texto | `NODE_VERSION` | `22` | El empaquetado pide Node 22 o superior. |
| Texto | `ALLOWED_ORIGINS` | `https://chaski.pages.dev` | Páginas que pueden llamar a `/extract`. Sin esto acepta cualquiera. |
| Texto | `MODEL` | opcional | Por defecto `gemini-3.5-flash-lite`. `gemini-3.8-flash` lee mejor pero tarda más. |
| Texto | `SITE_URL` | opcional | Solo si tu sitio no es `chaski.pages.dev`: dirección de la imagen al compartir por WhatsApp. |
| Texto | `ENDPOINT` | opcional | Dirección del Apps Script para guardar datos de varios dispositivos. |

- **No hace falta `EXTRACT_URL`.** Cuando el empaquetado corre en Cloudflare Pages usa `/extract` solo. Si la defines, manda la tuya (por ejemplo, la de un Worker aparte).
- Los cambios de variables se aplican en el **siguiente despliegue**: después de editarlas, reintenta el último despliegue.
- Las vistas previas de Pages usan otras direcciones (`https://<hash>.chaski.pages.dev`). Con `ALLOWED_ORIGINS` cerrado, en esas vistas el juego lee con reglas de palabras. Prueba en la dirección principal.

## 3. Verificar la lectura con el modelo

Prueba en vivo contra Gemini. En tu computadora, dentro de `worker/` (el servidor y la función comparten el mismo código):

```bash
cd worker && npm install
GEMINI_API_KEY=tu-clave npm run live           # tarda unos 90 s; usa tu cuota
```

En PowerShell: `$env:GEMINI_API_KEY="tu-clave"; npm run live`.

Corre explicaciones de los tres temas y dice si el modelo leyó lo esperado. Si algún caso falla, ajusta el prompt del tema en `worker/src/topics.ts` y vuelve a probar.

Ya desplegado, prueba la función (el encabezado `Origin` es necesario si cerraste `ALLOWED_ORIGINS`):

```bash
curl -s -X POST https://chaski.pages.dev/extract \
  -H "Content-Type: application/json" -H "Origin: https://chaski.pages.dev" \
  -d '{"text":"Si compras el doble pagas el doble.","topic":"proporciones"}'
```

Debe responder 200 con `"source":"modelo"`. Sin el encabezado `Origin` debe dar 403.

Para probar todo el sitio en tu computadora antes de subirlo:

```bash
CF_PAGES=1 npm run build:site
npx wrangler pages dev dist --binding GEMINI_API_KEY=tu-clave
```

## 4. Verificar

1. Abre `https://chaski.pages.dev/panel.html`, elige un tema y copia el enlace para estudiantes.
2. Ábrelo en un celular y juega un tema completo.
3. Con las herramientas del navegador, pestaña Red: la petición `POST /extract` debe dar 200. Si da error, el juego sigue funcionando con reglas de palabras, así que **un juego que funciona no prueba que el modelo esté conectado**: mira la respuesta, que debe traer `"source":"modelo"`.
4. En el panel de Cloudflare, *Functions → Real-time logs* muestra los errores de Google (la clave inválida, la cuota). El navegador nunca los recibe.

**Vista previa al compartir (WhatsApp):** el juego trae favicon y una imagen con el personaje. Detalles y cómo probarla en [../brand/README.md](../brand/README.md).

**Guardar datos de varios dispositivos:** agrega la variable `ENDPOINT` con la dirección del Apps Script (ver [../apps-script/README.md](../apps-script/README.md)).

## Alternativa: un Worker aparte

Sirve si prefieres separar la lectura del sitio, o alojar el sitio en otro lugar. El mismo código corre como Worker independiente:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY        # pega tu clave cuando la pida
npx wrangler deploy
```

Cierra su origen poniendo la dirección real del sitio en `ALLOWED_ORIGINS` de `worker/wrangler.toml` y vuelve a desplegar. Después, en Pages define `EXTRACT_URL=https://chaski-lector.tu-cuenta.workers.dev/extract` y reintenta el despliegue.

Para subir el sitio sin conectar GitHub: `EXTRACT_URL=... npm run build:site` y `npx wrangler pages deploy dist --project-name chaski`. No mezcles esto con un proyecto conectado a Git.

## Privacidad y datos

- El enlace lleva el código de clase (`?clase=`). Las páginas no mandan el referente (`no-referrer`), así que ese código no viaja a Google Fonts.
- El texto que escribe el estudiante se envía a Google (Gemini) a través de la función. Dilo antes de jugar y define el permiso de tutores si son menores.
- **Plan gratuito de Gemini:** según los términos de Google, lo que se envía se usa para mejorar sus productos y personas pueden leerlo (desvinculado de tu cuenta). Google pide no enviar información personal. Con el plan de pago, Google dice que no usa los datos para mejorar sus productos. Cada campo del juego ya recuerda no escribir datos personales.
- **Menores de 18 años:** los términos de la API de Gemini piden ser mayor de 18 y no permiten usar el servicio en un cliente dirigido a menores de 18 o que probablemente lo usen. Chaski es para secundaria, así que para aplicarlo con menores conviene consultar esos términos o usar el juego sin modelo, con reglas de palabras: basta no definir `GEMINI_API_KEY`.
- El panel docente es una página pública. Los datos que muestra son los del dispositivo, un archivo o la hoja de Google (esta última protegida con una clave). No hay cuentas.

## Límites y costos

- Las Pages Functions cuentan en la cuota gratuita diaria de Workers. Sobra para un piloto; revisa el límite vigente en tu cuenta.
- El plan gratuito de Gemini tiene un límite de solicitudes por minuto y por día; revisa los vigentes en AI Studio. Si se pasa, la función responde 503 y el juego lee con reglas de palabras.
- `gemini-3.8-flash` puede tardar más de los 12 s que espera el juego; en ese caso lee con reglas.
- No hay limitador de uso. Con `ALLOWED_ORIGINS` cerrado el riesgo es bajo, pero existe: quien llame desde otro origen recibe 403, pero un navegador de la propia página sí puede repetir llamadas.

## Deshacer

Borra el proyecto en el panel de Cloudflare (*Settings → Delete project*) o con `npx wrangler pages project delete chaski`, y borra la clave de Gemini en AI Studio si ya no la necesitas. Si usaste el Worker aparte: `cd worker && npx wrangler delete`.
