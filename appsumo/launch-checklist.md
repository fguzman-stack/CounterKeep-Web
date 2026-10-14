# Preparación de lanzamiento

La web y el material visual están preparados localmente. Esto no significa que el software esté aprobado para venderse ni que todos los requisitos de AppSumo estén completos. No se ha enviado CounterKeep a revisión.

## Referencias oficiales consultadas

- Brief vigente: https://partners.appsumo.com/docs/listing-brief.md
- Integración Licensing: https://docs.licensing.appsumo.com/
- Catálogos de category, subcategory, best_for y alternative_to consultados por el MCP en esta sesión

El brief pide una URL del producto, hero y galería fieles, stories emparejadas con capturas, precio de pago único, soporte y canje. Recomienda un primer plan a $49 o menos y 70%+ de descuento sobre un precio regular real; no son precios que hayamos aprobado ni un requisito obligatorio. Menciona una ventana de reembolso de AppSumo de 60 días, cuya aplicación debe confirmarse con el acuerdo final. No prometer reembolsos fuera de las condiciones aprobadas.

## Preparado

- [x] Web Astro estática, independiente, en inglés y español
- [x] Información basada en el código actual, sin prometer funciones futuras
- [x] Hero y cuatro capturas reales por idioma, PNG 1920×1080
- [x] Logo original copiado, sin rediseño
- [x] Textos alternativos y correspondencia entre stories y galería
- [x] Galería ampliable, ayuda, privacidad e información comercial de estado actual
- [x] Borrador de textos de ficha en listing-draft.md
- [x] Categorías y audiencias comprobadas contra catálogos del MCP
- [x] Sin cambios en el código o base de datos de CounterKeep

## Decisiones del fundador

- [ ] Dominio o URL pública HTTPS y proveedor de alojamiento
- [ ] Correo real de soporte y contacto legal/de privacidad
- [ ] Identidad del fundador, historia real en primera persona, fecha de fundación, sede, tamaño, etapa y financiación
- [ ] Modalidad Codes o Licensing; plan o planes y precio único
- [ ] Alcance de acceso de por vida, actualizaciones, equipos, negocios y transferencias de licencia
- [ ] Workspace correcto de AppSumo (no reutilizar automáticamente el workspace de DocuMind AI)
- [ ] Revisión y aprobación de capturas, copy y vista previa antes de enviar
- [ ] Original horizontal de la marca si el tipo de listing lo exige

## Entrega del software, bloqueante antes de vender

- [ ] Compilar y probar un instalador final en una instalación limpia de Windows 10/11
- [ ] Definir distribución HTTPS, versión, firma del instalador y controles de integridad
- [ ] Implementar y verificar el canje real con códigos o la integración Licensing
- [ ] Verificar revocación/reembolso y su relación con una aplicación que funciona offline
- [ ] Si Codes: leer min_codes/max_codes del ticket antes de generar o subir CSV; cada código debe existir en el sistema real
- [ ] Si Licensing: endpoints HTTPS, secreto solo en servidor, flujo OAuth y pruebas test_licensing
- [ ] Probar que registros y ajustes sobreviven al reinicio de la app instalada
- [ ] Asegurar una estrategia de respaldo y recuperación; actualmente hay exportación, pero la restauración completa consta como pendiente
- [ ] Revisar restricciones/roles antes de prometer administración de permisos
- [ ] Aprobar documentos legales finales; las páginas informativas actuales no son un contrato comercial

Las capturas prueban el aspecto de la interfaz, no el funcionamiento de persistencia nativa, del instalador ni de licencias. Esas comprobaciones no se han sustituido por una captura bonita.

## Secuencia MCP cuando exista URL pública

1. list_submissions para evitar duplicados, y list_workspaces para confirmar la empresa
2. submit_url con la URL pública y el workspace autorizado
3. get_submission_status hasta ready, aplicar contenido revisado con update_submission
4. Subir logo, hero y las cuatro capturas usando request_image_upload o upload_image
5. Completar planes, datos reales del fundador, FAQs e instrucciones de canje
6. Verificar get_fulfillment, canje real y test_licensing si aplica
7. preview_listing y entregar al fundador su enlace de borrador para aprobación
8. Solo después de aprobación explícita: submit_for_review

No llamar submit_for_review como un supuesto modo de validación: si el borrador está completo, lo envía de verdad.
