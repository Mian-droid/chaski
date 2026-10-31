# Servidor intermedio de Chaski

Cloudflare Worker que lee la explicación del estudiante con un modelo de Anthropic y devuelve las fichas de Chaski. Existe porque la clave de Anthropic no puede ir en la página.

El modelo **solo lee**: nunca resuelve problemas. Ver [../docs/arquitectura.md](../docs/arquitectura.md).

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
| `ANTHROPIC_API_KEY` | Secreto | Clave de Anthropic. **Nunca** va en `wrangler.toml`. |
| `MODEL` | `wrangler.toml` | Modelo. Por defecto `claude-opus-5-5` con esfuerzo bajo. `claude-haiku-5-5` es más rápido y barato. |
| `ALLOWED_ORIGINS` | `wrangler.toml` | Páginas que pueden llamar al servidor, separadas por coma. `*` acepta cualquiera: usarlo solo para pruebas. |

## Desplegar

Guía completa, con el sitio y la verificación: [../docs/despliegue.md](../docs/despliegue.md). Solo el servidor:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Copia la dirección que muestra, agrega `/extract` y ponla en `EXTRACT_URL` de `../js/config.js`. Cambia `ALLOWED_ORIGINS` por la dirección donde publiques el juego.

## Pruebas

```bash
npm test                         # 14 pruebas con un cliente simulado: no llaman al modelo ni gastan dinero
ANTHROPIC_API_KEY=... npm run live   # prueba en vivo con el modelo real: GASTA dinero (centavos)
```

`scripts/live-test.mjs` corre explicaciones de ejemplo de cada tema (buenas, con el error típico, con negación, vagas y con una instrucción escondida) y dice si el modelo leyó lo esperado. **Todavía no se ha corrido con una clave real.** Si algún caso no coincide, ajusta el prompt del tema en `src/topics.ts` o `src/extract.ts`.

## Agregar un tema

Ver [../docs/contenido-de-temas.md](../docs/contenido-de-temas.md). En el servidor hay que agregar el identificador a `TOPIC_IDS` y una entrada en `TOPICS` en `src/topics.ts`.

## Límites

- Sin limitador de uso: con `ALLOWED_ORIGINS` abierto, cualquiera que conozca la dirección puede gastar la clave.
- No hay reintento con otro modelo si el modelo rechaza la solicitud (`refusal`). Para explicaciones de matemática de secundaria es muy poco probable, y el juego cae a las reglas.
- El costo por lectura se estimó en centavos o menos; no se midió.
