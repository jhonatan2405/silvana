# Certificado de Supabase

CA pública de Supabase Root 2021, descargada por HTTPS desde https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt . No contiene secretos. Se utiliza solo para verificar la conexión a hosts de Supabase; no se instala en el sistema operativo.

`pg` valida CA y nombre del host (`rejectUnauthorized: true`). `DATABASE_CA_CERT` permite sustituir el archivo por otro certificado oficial. Revisar su vencimiento al actualizar la infraestructura.
