# Marca: favicon e imagen para compartir

Lo que se publica con el sitio (`npm run build:site` lo copia a `dist/brand/`):

| Archivo | Para qué |
|---|---|
| `favicon.svg` | Ícono de la pestaña en los navegadores modernos. Es la cabeza de Chaski sobre fondo de sol. |
| `favicon.ico` | Respaldo para navegadores viejos y para quien pide `/favicon.ico` (16, 32 y 48 px). |
| `apple-touch-icon.png` | Ícono al guardar el juego en la pantalla de inicio del iPhone (180 px, sin esquinas redondeadas: iOS pone las suyas). |
| `og-image.jpg` | Imagen de la vista previa al compartir por WhatsApp, Telegram y redes (1200 x 630, 136 KB; WhatsApp prefiere menos de 300 KB). |

WhatsApp no muestra el favicon: muestra la imagen `og-image.jpg`, el título y la descripción que están en las etiquetas `og:` de `index.html`.

## Compartir por WhatsApp

- La imagen se pide con **dirección completa**. `index.html` trae `https://chaski.pages.dev`. Si el sitio vive en otra dirección, empaquétalo con `SITE_URL=https://tu-dominio npm run build:site` (o agrega la variable `SITE_URL` en Cloudflare Pages).
- **Probar:** la vista previa solo se puede ver con el sitio publicado. Pega el enlace en un chat contigo mismo. WhatsApp guarda la vista previa de cada enlace; si cambias la imagen y no se actualiza, agrega algo al enlace (por ejemplo `&v=2`) o prueba otro enlace del mismo sitio.
- La descripción y la imagen son las mismas para los tres temas.

## Cómo se generan

Se regeneran solo si cambia el personaje o los colores. Se necesita Chrome y el servidor del proyecto (`npm run serve`, puerto 5190).

1. **Ícono:** edita `favicon.svg`. `icon.html` lo muestra a pantalla completa (con `?sq=1`, sin esquinas redondeadas).
2. **PNG del ícono:** con Chrome sin ventana, saca una captura de `http://localhost:5190/brand/icon.html` a 512 x 512 con fondo transparente (`--headless=new --default-background-color=00000000 --window-size=512,512 --screenshot=...`). Chrome no baja de unos 500 px, así que reduce después a 16, 32 y 48 px (`_icon-16.png`, `_icon-32.png`, `_icon-48.png`) y, con `?sq=1`, a 180 px para `apple-touch-icon.png`.
3. **`.ico`:** `node brand/make-ico.mjs` junta los tres PNG de 16, 32 y 48 px. Después borra los `_icon-*.png`.
4. **Imagen para compartir:** captura `http://localhost:5190/brand/og-image.html` a 1200 x 630 (`--window-size=1200,630 --force-device-scale-factor=1`) y guárdala como JPEG calidad 86 en `og-image.jpg`. `og-image.html` usa el paisaje de `mockup/paisaje.js`.
