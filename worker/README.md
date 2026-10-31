# Servidor intermedio de Chaski

Cloudflare Worker que lee la explicación del estudiante con un modelo de Google Gemini y devuelve las fichas de Chaski. Existe porque la clave de Gemini no puede ir en la página.

El modelo **solo lee**: nunca resuelve problemas. Ver [../docs/arquitectura.md](../docs/arquitectura.md).

Este código corre de dos formas: dentro del sitio como Pages Function (`../functions/extract.ts`, la forma recomendada, ver [../docs/despliegue.md](../docs/despliegue.md)) o como Worker independiente (esta carpeta). Las pruebas cubren las dos.

## Interfaz

`POST /extract`

```json
{ "text": "Si compras el doble pagas el doble.", "topic": "proporciones" }
```

- `text`: entre 8 y 800 caracteres.
- `topic` (opcional, `proporciones` por defecto): `proporciones`, `porcentajes` o `ecuaciones`. Cualquier otro valor da 400.

Respuesta 200:

```json
{
  "cards": {
    "K1": { "state": "bien", "evidence": "pagas el doble" },
    "K2": { "state": "ausente", "evidence": "" },
    "K3": { "state": "ausente", "evidence": "" }
  },
  "restatement": "Entendí que si compro el doble pago el doble.",
  "source": "modelo"
}
```

Una ficha solo queda `bien` o `mal` si su `evidence` aparece en el texto del estudiante. Si no, el servidor la vuelve `ausente`.

| Código | Cuándo |
|---|---|
| 200 | Lectura correcta |
| 400 | JSON inválido, texto fuera de rango o tema desconocido |
| 403 | Origen no permitido (`ALLOWED_ORIGINS`) |
| 404 | Ruta o método distintos de `POST /extract` |
| 500 | El servidor no tiene clave configurada, o error interno |
| 502 | El modelo no respondió, rechazó la solicitud o devolvió algo sin formato |
| 503 | Demasiadas solicitudes al modelo |

El juego ignora cualquier error y lee con reglas de palabras.

## Configuración

| Variable | Dónde | Qué hace |
|---|---|---|
| `GEMINI_API_KEY` | Secreto | Clave de Gemini (Google AI Studio). **Nunca** va en `wrangler.toml`. |
| `MODEL` | `wrangler.toml` | Modelo. Por defecto `gemini-3.5-flash-lite`, que responde rápido. `gemini-3.8-flash` lee mejor pero piensa más y puede pasar los 12 s que espera el juego; en ese caso el juego lee con reglas. |
| `ALLOWED_ORIGINS` | `wrangler.toml` | Páginas que pueden llamar al servidor, separadas por coma. `*` acepta cualquiera: usarlo solo para pruebas. |

## Desplegar

Guía completa, con el sitio y la verificación: [../docs/despliegue.md](../docs/despliegue.md). Solo el servidor:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

Copia la dirección que muestra, agrega `/extract` y ponla en `EXTRACT_URL` de `../js/config.js`. Cambia `ALLOWED_ORIGINS` por la dirección donde publiques el juego.

## Pruebas

```bash
npm test                         # 18 pruebas con un fetch simulado: no llaman a Gemini ni gastan cuota
GEMINI_API_KEY=... npm run live  # prueba en vivo con Gemini: usa tu cuota (PowerShell: $env:GEMINI_API_KEY="..."; npm run live)
```

`scripts/live-test.mjs` corre explicaciones de ejemplo de cada tema (buenas, con el error típico, con negación, vagas y con una instrucción escondida) y dice si el modelo leyó lo esperado. **Todavía no se ha corrido con una clave real.** Tarda unos 90 s porque espacia las llamadas (`PAUSE_MS`, 4000 por defecto) para no pasar el límite por minuto del plan gratuito. Si algún caso no coincide, ajusta el prompt del tema en `src/topics.ts` o `src/extract.ts`.

## Agregar un tema

Ver [../docs/contenido-de-temas.md](../docs/contenido-de-temas.md). En el servidor hay que agregar el identificador a `TOPIC_IDS` y una entrada en `TOPICS` en `src/topics.ts`.

## Límites

- Sin limitador de uso: con `ALLOWED_ORIGINS` abierto, cualquiera que conozca la dirección puede gastar la clave.
- No hay reintento si Gemini rechaza o bloquea la solicitud (`blockReason`). Para explicaciones de matemática de secundaria es muy poco probable, y el juego cae a las reglas.
- El formato de la llamada (`generateContent` con `responseSchema`) sigue la documentación de Google, pero **no se ha probado con una clave real**: Google rechazó la clave de prueba antes de revisar el modelo y el esquema.
- **Términos de Google:** los términos de la API de Gemini no permiten usarla en un cliente dirigido a menores de 18 años o que probablemente usen ellos. Y en el plan gratuito, Google usa lo enviado para mejorar sus productos y personas pueden revisarlo. Ver [../docs/despliegue.md](../docs/despliegue.md#privacidad-y-datos).
