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

**Guardar datos de varios dispositivos:** ver el paso 5.

## 5. Guardar los datos de los estudiantes (opcional)

Sin esto, cada partida queda solo en el navegador del estudiante. Con la base de datos **D1** de Cloudflare, el panel docente muestra los resultados de todos los dispositivos. Todo se configura en el panel de Cloudflare, sin instalar nada.

1. *Storage & Databases → D1 SQL database → Create*. Nombre: `chaski-db`.
2. En esa base, pestaña *Console*: pega el contenido de [`db/schema.sql`](../db/schema.sql) y ejecútalo. Crea la tabla `events` con su índice y la tabla `rate`, que usan los límites de uso. El archivo no lleva comentarios a propósito: la consola junta lo pegado en una línea y un comentario taparía el resto. Si da error, ejecuta las dos sentencias por separado.
3. En el proyecto de Pages: *Settings → Bindings → Add → D1 database*. Variable `DB`, base `chaski-db` (en producción y en vistas previas).
4. En *Variables and Secrets*: un secreto `PANEL_KEY` con una clave larga (20 caracteres o más) y una variable de texto `ENDPOINT` con el valor `/events`.
5. Reintenta el último despliegue.

Para comprobarlo, juega una partida y pide los datos con la clave (el encabezado es obligatorio; la clave nunca va en la dirección):

```bash
curl -s -H "X-Panel-Key: TU_CLAVE" "https://chaski.pages.dev/events?cls=3A2026"
```

Debe responder `{"events":[...]}`. Sin el encabezado responde 401. En el panel docente, escribe el código de clase y la clave y toca **Base de datos**.

- **Guardar** lo hace el juego de cada estudiante, sin clave: acepta hasta 100 eventos por envío, valida cada evento y descarta los que no tienen la forma esperada. Con `ALLOWED_ORIGINS` definido solo acepta la página del juego.
- **Límites de uso.** Con la base enlazada, el servidor frena a quien llame de más: cada IP puede hacer 150 lecturas con el modelo y 400 envíos de partidas cada 10 minutos (un colegio entero comparte una IP, por eso son holgados), y en total hay un tope de 3 000 lecturas con el modelo por día. Al frenar responde 429 con `Retry-After` y el juego sigue con reglas de palabras. Se ajustan con las variables de texto `RATE_LIMIT_EXTRACT`, `RATE_LIMIT_EVENTS` y `DAILY_MODEL_CALLS`. La IP no se guarda: solo una huella corta que caduca a los pocos minutos. Si la base falla, no se limita nada para no dejar sin juego a la clase.
- **Leer y borrar** son del panel y exigen `PANEL_KEY`. El botón *Borrar del servidor los datos de esta clase* elimina todos los eventos de esa clase.
- El juego reintenta el envío en la siguiente pantalla clave si el servidor no responde, y la copia del dispositivo no se pierde.
- Para probar todo en tu computadora: `$env:ENDPOINT="/events"; $env:CF_PAGES="1"; npm run build:site` (PowerShell) y `npx wrangler pages dev dist --d1=DB --binding PANEL_KEY=una-clave`. Las tablas se crean antes con `npx wrangler d1 execute` y `db/schema.sql`.
- Alternativa sin base de datos: un Apps Script que escribe en una hoja de Google ([../apps-script/README.md](../apps-script/README.md)); en ese caso `ENDPOINT` es la dirección del script.

## 6. Protección adicional contra bots (opcional)

Los límites del servidor frenan abusos sencillos. Para más protección, Cloudflare ofrece dos capas sin tocar el código:

- **Regla de límite de solicitudes (WAF).** En el panel de Cloudflare del dominio: *Security → WAF → Rate limiting rules*. El plan gratuito permite una regla, por ejemplo: la ruta `/extract` más de 30 solicitudes en 10 segundos desde la misma IP, con la acción *Block*.
- **Turnstile.** Un desafío invisible que distingue personas de bots, para exigirlo antes de leer con el modelo. Requiere agregarlo al juego, así que no está incluido.
- Mantén `ALLOWED_ORIGINS` con la dirección del sitio: sin ella, cualquier página puede llamar a `/extract` desde un navegador.

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
- El panel docente es una página pública. Los datos que muestra son los del dispositivo, un archivo, la base de datos o la hoja de Google (estas dos últimas protegidas con una clave). No hay cuentas.
- Con la base de datos, los textos que escriben los estudiantes se guardan en el servidor hasta que el docente los borre desde el panel. No hay borrado automático: el tiempo de conservación lo decide quien aplique el piloto.

## Límites y costos

- Las Pages Functions cuentan en la cuota gratuita diaria de Workers. Sobra para un piloto; revisa el límite vigente en tu cuenta.
- El plan gratuito de Gemini tiene un límite de solicitudes por minuto y por día; revisa los vigentes en AI Studio. Si se pasa, la función responde 503 y el juego lee con reglas de palabras.
- `gemini-3.8-flash` puede tardar más de los 12 s que espera el juego; en ese caso lee con reglas.
- No hay limitador de uso. Con `ALLOWED_ORIGINS` cerrado el riesgo es bajo, pero existe: quien llame desde otro origen recibe 403, pero un navegador de la propia página sí puede repetir llamadas.

## Deshacer

Borra el proyecto en el panel de Cloudflare (*Settings → Delete project*) o con `npx wrangler pages project delete chaski`, y borra la clave de Gemini en AI Studio si ya no la necesitas. Si usaste el Worker aparte: `cd worker && npx wrangler delete`.
