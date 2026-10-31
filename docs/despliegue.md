# Despliegue en Cloudflare

Dos piezas, en este orden:

1. **El servidor** (Worker): lee la explicación con el modelo. Lleva la clave de Anthropic.
2. **El sitio** (Pages): el juego y el panel docente, como archivos estáticos.

Si solo quieres probar el juego sin el modelo, salta al paso 3 y empaqueta sin `EXTRACT_URL`: Chaski leerá con reglas de palabras.

> Estado: el servidor se empaquetó (1,7 MiB, 288 KiB comprimido) y se probó en el runtime local de Cloudflare (workerd) con una clave falsa. **Nunca se ha desplegado** ni se ha llamado al modelo con una clave real. Los pasos de abajo no se han ejecutado contra una cuenta.

## Qué necesitas

- Una cuenta de Cloudflare (el plan gratuito alcanza para un piloto).
- Una clave de API de Anthropic. Conviene fijar un **límite de gasto** en la consola de Anthropic antes de exponer el servidor.
- Node 22 o superior.

## 1. Servidor

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # pega tu clave cuando la pida
npx wrangler deploy
```

`deploy` muestra la dirección del servidor, por ejemplo `https://chaski-lector.tu-cuenta.workers.dev`. Guárdala.

## 2. Probar el servidor con el modelo real

Antes de que lo use ningún estudiante:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run live      # dentro de worker/; gasta centavos
```

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

Atajo: `npm run deploy:site` hace los dos pasos, pero necesita `EXTRACT_URL` en el entorno.

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
- El texto que escribe el estudiante se envía a Anthropic a través del servidor. Dilo antes de jugar y define el permiso de tutores si son menores.
- El panel docente es una página pública. Los datos que muestra son los del dispositivo, un archivo o la hoja de Google (esta última protegida con una clave). No hay cuentas.

## Límites y costos

- Workers y Pages tienen cuotas gratuitas diarias que sobran para un piloto. Revisa los límites vigentes en tu cuenta.
- El costo del modelo es por lectura (centavos o menos, estimado y no medido). `MODEL = "claude-haiku-5-5"` en `wrangler.toml` es más rápido y más barato.
- El servidor no tiene limitador de uso. Con el origen cerrado y un límite de gasto en Anthropic el riesgo es bajo, pero existe.

## Deshacer

```bash
cd worker && npx wrangler delete                       # quita el servidor
npx wrangler pages project delete chaski               # quita el sitio
```

Y revoca la clave de Anthropic en su consola si ya no la necesitas.
