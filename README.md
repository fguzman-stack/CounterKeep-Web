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

El MCP creó y completó el borrador de CounterKeep, id `232349`, en el workspace elegido por el fundador. Editor: https://partners.appsumo.com/self-submission/232349/build?from=agent. No se ha enviado a revisión: el fundador debe revisar y aprobar el borrador. El canje, las licencias firmadas y el CSV de 1.000 códigos se prepararon y probaron; AppSumo aceptó el CSV. Antes de enviar, revisar el preview y las condiciones finales.

El fundador confirmó un plan de US$49 de pago único para un equipo Windows, acceso de por vida a las funciones del plan y sus actualizaciones, sin prometer ediciones futuras separadas. También confirmó `familiazv2016@gmail.com` como soporte público. El borrador usa la modalidad Codes, sin stacking.

## Canje y distribución 0.2.0

Página de canje: `/activate-ck-8f42b19e/`, con versión española bajo `/es/`. No aparece en menús ni sitemap y usa `noindex`. Esto no la hace privada: el código se valida en Supabase, nunca en una lista pública del navegador.

El proyecto Supabase compartido con DocuMind fue elegido por el usuario; las tablas y funciones de CounterKeep están aisladas. Ver `supabase/README.md` para límites de confianza, revocación offline, administración y respaldo.

Los archivos de instalación se distribuyen como assets de `desktop-v0.2.0` en GitHub Releases, no dentro de `public/`. `public/downloads/release.json` contiene URLs y hashes SHA-256. Los instaladores no tienen firma Authenticode; el archivo de licencia sí lleva firma Ed25519, conceptos distintos.

`private/` contiene el CSV original y datos de QA. Está ignorado por git y restringido con ACL local. Nunca subir esta carpeta a GitHub, Pages, un release o un servicio público. Los códigos de prueba son distintos de los 1.000 códigos de clientes.

La privacidad e información comercial de la web describen el estado actual, no sustituyen documentos legales aprobados. Sin testimonios inventados, estadísticas de adopción, precios, plazo de respuesta ni promesas de funciones pendientes.
