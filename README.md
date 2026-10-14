# CounterKeep Web

Repositorio: https://github.com/fguzman-stack/CounterKeep-Web

Web pública: https://fguzman-stack.github.io/CounterKeep-Web/ (español: `/es/`). El workflow `.github/workflows/pages.yml` publica los cambios de `main` automáticamente en GitHub Pages. El correo de soporte se configura con la variable de repositorio `SITE_SUPPORT_EMAIL` cuando esté confirmado.

Web independiente de CounterKeep creada con Astro y salida estática. Idiomas: inglés (`/`) y español (`/es/`). No modifica ni depende del código de la aplicación en producción.

## Desarrollo y verificación

Requiere Node.js compatible con Astro 7 (Node 22.12+ o 24+) y npm.

```powershell
npm install
npm run dev
```

Abrir `http://127.0.0.1:4321/es/`. Para verificar:

```powershell
npm run build
npm run preview
# En otra terminal, con preview ejecutándose:
npm test
```

Si Chromium no está instalado: `npx playwright install chromium`.

## Capturas reales

`public/images/` contiene un hero y cuatro capturas por idioma, 1920 × 1080, sin marcos de dispositivos ni pantallas inventadas. `capture-manifest.json` documenta su procedencia. Se captura el frontend real en la vista previa del navegador, con datos ficticios inyectados solo en un contexto aislado de Playwright. No se alteran la app ni la base SQLite real. No equivale a probar las operaciones nativas.

Para regenerarlas, ejecutar el Vite de CounterKeep en `http://localhost:1420` y luego `npm run capture` aquí. Variables opcionales: `PRODUCT_URL` y `PRODUCT_SOURCE`. El script requiere el servidor de desarrollo del producto, no su build estático.

## Publicar

Confirmar primero dominio, identidad legal, soporte y condiciones comerciales. La web todavía indica que el lanzamiento comercial está pendiente.

```powershell
$env:SITE_URL = "https://TU-DOMINIO-REAL"
$env:SITE_SUPPORT_EMAIL = "TU-CORREO-REAL"
npm run build
```

Estos valores son instrucciones de configuración, no direcciones existentes. Astro los usa durante la compilación; no basta con configurarlos después del build.

Subir `dist/` a Cloudflare Pages, Netlify, Vercel o un alojamiento estático HTTPS. Build: `npm run build`; directorio de publicación: `dist`. No necesita backend. No exponer los servidores de desarrollo.

Si se publica en una subruta (por ejemplo GitHub Pages), configurar además `BASE_PATH=/NOMBRE-DEL-REPOSITORIO/` antes del build. El sitio respeta esta ruta en navegación, capturas, scripts, canonical y sitemap. `SITE_URL` es el origen público, sin la subruta.

## Preparación de AppSumo

- `appsumo/listing-draft.md`: copy del producto en los campos del brief, con datos comerciales pendientes marcados
- `appsumo/launch-checklist.md`: requisitos y decisiones pendientes; enlaces oficiales
- `appsumo/media.json`: slots, imágenes y textos alternativos

No se ha creado ni enviado una ficha para CounterKeep en AppSumo. El MCP necesita una URL pública para iniciar la ficha. Antes de crearla hay que escoger el workspace; antes de enviarla hay que revisar el preview y obtener aprobación.

La privacidad e información comercial de la web describen el estado actual, no sustituyen documentos legales aprobados. Sin testimonios inventados, estadísticas de adopción, precios, plazo de respuesta ni promesas de funciones pendientes.
