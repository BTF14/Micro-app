# Evaluación de Google Drive como destino de backups

**Fecha de evaluación:** 2026-10-18  
**Estado:** candidato técnicamente viable; no configurado ni aprobado como destino definitivo.  
**Restricción obligatoria:** coste total $0, sin tarjeta, facturación ni cargos automáticos.

## Conclusión

Google Drive personal puede servir como destino externo de copias lógicas cifradas de PostgreSQL, siempre que la cuenta tenga espacio libre suficiente y se implemente una autenticación de larga duración que se pueda supervisar. La API de Drive permite cargar archivos y su uso estándar no tiene coste adicional según la documentación consultada. Una cuenta Google incluye hasta 15 GB compartidos entre Gmail, Drive y Google Photos, no 15 GB exclusivos para los backups.

Fuentes oficiales:
- [Almacenamiento de Google Account](https://support.google.com/drive/answer/9312312?hl=en-en)
- [Drive API: límites y precios](https://developers.google.com/workspace/drive/api/guides/limits)
- [Drive API: cargar archivos](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [OAuth 2.0: expiración de refresh tokens](https://developers.google.com/identity/protocols/oauth2)

## Ventajas

- Destino externo a Neon y al repositorio Git.
- Puede funcionar desde un workflow programado de GitHub Actions sin mantener el teléfono o una PC encendidos.
- El backup puede cifrarse localmente en el runner antes de subirlo.
- La API estándar de Drive no tiene coste adicional mientras se respeten sus límites publicados.

## Riesgos y condiciones que deben resolverse

1. **Espacio real:** los 15 GB se comparten con Gmail y Photos. Hay que comprobar espacio libre y tamaño real de un dump; no se ha consultado la cuenta del usuario.
2. **OAuth persistente:** la automatización necesita OAuth 2.0 y secretos guardados en GitHub Actions. No pedir ni guardar tokens en el chat o en Git. Si la app OAuth permanece en estado “Testing” para usuarios externos, los refresh tokens suelen expirar a los 7 días; por eso no se debe asumir que una configuración rápida funcionará indefinidamente.
3. **Cuenta de servicio:** no es una solución directa para un Drive personal. Las cuentas de servicio no tienen cuota de almacenamiento propia ni pueden ser propietarias de archivos de My Drive. Requerirían un Shared Drive de Workspace o actuar en nombre de una persona mediante OAuth; Shared Drives no están disponibles para crearlos con una cuenta personal gratuita.
4. **Presupuesto estricto:** Google indica que el uso estándar de la API no tiene coste adicional, pero la documentación actual menciona cambios de cuotas y posibles cargos por superar umbrales más adelante en 2026. No habilitar billing ni una cuenta de facturación para esta tarea. Antes de usarlo, comprobar que la cuota del proyecto puede respetarse sin habilitar pagos.
5. **Dependencia de la cuenta:** suspensión, pérdida de acceso, revocación de OAuth, eliminación accidental o falta de espacio pueden detener los backups. Se necesita alerta de fallo y procedimiento para renovar autorización.
6. **Seguridad:** los archivos deben cifrarse antes de subirlos, con la clave separada del archivo y almacenada como secreto. Drive debe quedar privado, sin enlaces públicos. La copia debe tener checksum, política de retención y restauración de prueba.
7. **Independencia limitada:** si la cuenta de Google o sus credenciales se comprometen, el atacante podría borrar backups. Drive es mejor que no tener copia externa, pero no equivale a almacenamiento inmutable.

## Arquitectura propuesta para una prueba sin datos reales

1. Crear un dump de una base PostgreSQL desechable con datos sintéticos.
2. Cifrarlo en el runner antes de la transferencia y generar un checksum.
3. Subirlo a una carpeta privada de Drive usando OAuth; almacenar client secret, refresh token y clave de cifrado solo en GitHub Actions Secrets.
4. Verificar metadatos, tamaño, checksum después de descargar y descifrar en el entorno aislado.
5. Restaurarlo en otro PostgreSQL desechable y comprobar esquema, migraciones, restricciones y relaciones.
6. Probar expiración/revocación de credenciales, cuota agotada, error de subida y alerta de fallo.
7. Solo después de demostrar recuperación y coste $0, considerar la activación para datos reales bajo la política de `docs/BACKUP_AND_RECOVERY.md`.

No subir datos reales hasta que el procedimiento de restauración esté probado y se haya confirmado el acceso a la carpeta de destino. No usar artefactos de GitHub como sustituto del destino independiente.

## Decisión actual

- Google Drive: **candidato viable condicionado**, no seleccionado ni configurado.
- Backup automático: **no activo**.
- Restauración verificada: **no**.
- Acceso/espacio de la cuenta Google: **no verificado**.
- Credenciales OAuth y secretos: **no creados ni almacenados**.
- Coste: se mantiene la prohibición de activar billing o aceptar cargos.

Próximo paso técnico: diseñar y probar un pequeño flujo de backup/restore con PostgreSQL efímero y datos sintéticos; evaluar también una alternativa gratuita de almacenamiento de objetos solo si su coste, cuotas y necesidad de tarjeta pueden verificarse sin habilitar facturación.
