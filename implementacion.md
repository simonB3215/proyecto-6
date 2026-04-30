Épica 1: Arquitectura y Escalabilidad Core
Historia de Usuario 1: Como Arquitecto de Software, quiero encolar las solicitudes de escaneo utilizando BullMQ y Redis para evitar la saturación del servidor principal durante picos de demanda.

Criterios de Aceptación (Resultados Esperados):

El endpoint de inicio de escaneo devuelve un job_id inmediatamente en lugar de bloquearse esperando la resolución del escaneo.

Los procesos de Nmap se ejecutan en workers aislados (contenedores) que consumen la cola de Redis de forma asíncrona.

El estado del trabajo (pending, processing, completed, failed) se actualiza en tiempo real en la base de datos de Supabase.

Consideración Técnica: Desplegar una instancia de Redis y modificar el backend de Node.js para publicar tareas; levantar procesos separados en Node.js exclusivos para consumir y procesar los jobs.

Historia de Usuario 2: Como Desarrollador de Seguridad, quiero integrar el motor DAST OWASP ZAP al flujo de análisis para detectar vulnerabilidades dinámicas web (XSS, inyecciones SQL) más allá de los puertos abiertos.

Criterios de Aceptación (Resultados Esperados):

El worker de escaneo orquesta llamadas a la API de OWASP ZAP (ZAP CLI/Daemon).

Los resultados dinámicos de ZAP se normalizan en formato JSON.

Los datos de infraestructura (Nmap) y dinámicos (ZAP) se unifican en un único esquema relacional por auditoría.

Consideración Técnica: Crear un adaptador en Node.js que transforme las salidas crudas (XML/JSON) de las distintas herramientas hacia la estructura de tablas de Postgres en Supabase.

Historia de Usuario 3: Como Administrador del Sistema, quiero automatizar el respaldo de la base de datos para garantizar la continuidad operativa ante desastres o límites de capa gratuita.

Criterios de Aceptación (Resultados Esperados):

Se ejecuta un volcado de base de datos (pg_dump) automáticamente todos los días en horario de baja carga.

El archivo resultante se comprime y se envía a un almacenamiento externo en la nube (ej. AWS S3 o Cloudflare R2).

Se despacha una alerta silenciosa al equipo si el respaldo falla.

Consideración Técnica: Configurar un script mediante GitHub Actions o un Cron Job remoto utilizando el string de conexión de Supabase Postgres.

Épica 2: Seguridad y Validaciones de Negocio
Historia de Usuario 4: Como Administrador de la Plataforma, quiero validar criptográficamente que el usuario es dueño del dominio ingresado para evitar escaneos ilegales a infraestructuras de terceros.

Criterios de Aceptación (Resultados Esperados):

El sistema genera un token único (ej. aegis-verify=UUID-1234) asociado al perfil del usuario y al dominio.

La interfaz (React) instruye al usuario a agregar este token como un registro TXT en su proveedor DNS.

El escaneo se bloquea por completo hasta que el backend verifica la propagación y existencia exacta de ese registro TXT.

Consideración Técnica: Utilizar el módulo nativo de Node.js dns.resolveTxt en el backend para realizar el chequeo previo a la creación del job en Redis.

Historia de Usuario 5: Como CTO de una Agencia, quiero poder clasificar los hallazgos como "falsos positivos" en el dashboard para limpiar el ruido técnico antes de enviar el reporte final.

Criterios de Aceptación (Resultados Esperados):

La vista de detalle de vulnerabilidades incluye un control para "Aceptar Riesgo" o "Falso Positivo".

Al activarlo, la vulnerabilidad se oculta de la vista gerencial principal del dashboard.

El motor de reportes omite estrictamente estos hallazgos al generar el documento PDF final.

Consideración Técnica: Agregar una columna booleana is_false_positive en la tabla de hallazgos y exponer un endpoint protegido por políticas RLS (Row Level Security) para su actualización.

Épica 3: Motor de Valor y Reportes
Historia de Usuario 6: Como Ejecutivo de Negocios, quiero recibir un reporte en PDF estructurado bajo la fórmula QPR (Pregunta, Problema, Resolución) para entender el riesgo sin necesitar conocimientos técnicos avanzados.

Criterios de Aceptación (Resultados Esperados):

El PDF autogenerado inicia con un "Resumen Ejecutivo" visual indicando el nivel de riesgo global.

Cada vulnerabilidad crítica detalla: Impacto de negocio (Question), Descripción técnica (Problem) y Guía de corrección o snippet (Resolution).

El documento se consolida de forma segura y se entrega mediante un enlace firmado con expiración temporal.

Consideración Técnica: Integrar Puppeteer o un motor de plantillas en Node.js para renderizar código HTML/Tailwind a PDF, subiéndolo luego a Supabase Storage.

Historia de Usuario 7: Como Consultor de Cumplimiento, quiero ver cada vulnerabilidad cruzada automáticamente con su respectivo control de la norma ISO 27001 para facilitar procesos de auditoría formal.

Criterios de Aceptación (Resultados Esperados):

La base de datos relaciona los identificadores de vulnerabilidad (ej. CVEs o tipos CWE) con controles específicos (ej. A.10 Criptografía).

El dashboard y el reporte PDF incluyen una tabla matriz de "Estado de Cumplimiento ISO 27001".

Se resalta qué controles exactos se encuentran en incumplimiento según los hallazgos del escáner.

Consideración Técnica: Diseñar un modelo de datos con una tabla de referencia iso_controls y una tabla intermedia para establecer relaciones muchos a muchos con los perfiles de vulnerabilidad.

Épica 4: Estructura Comercial y Regulatoria
Historia de Usuario 8: Como Cliente B2B, quiero seleccionar y suscribirme a un nivel de servicio (Tier) específico para acceder a los límites de escaneo y funciones que mi empresa necesita.

Criterios de Aceptación (Resultados Esperados):

La aplicación cuenta con una vista de "Planes" detallando cuotas (Starter, Pro/Agencia).

El flujo redirige a una pasarela de pagos para registrar la suscripción mensual.

El backend valida activamente la cuota del usuario y su estado de suscripción antes de encolar cualquier análisis.

Consideración Técnica: Integrar Stripe Checkout (o pasarela equivalente) y sincronizar los webhooks hacia una tabla subscriptions en Postgres para gobernar los permisos de la aplicación.

Historia de Usuario 9: Como Gerente en Chile, quiero visualizar mi nivel de cumplimiento frente a la nueva Ley Marco sobre Ciberseguridad (21.663) para mitigar el riesgo de multas estatales.

Criterios de Aceptación (Resultados Esperados):

El sistema incluye un indicador visual tipo "Score de Preparación Legal" basado en los hallazgos técnicos.

Las alertas críticas mencionan si la vulnerabilidad incumple los principios de prevención exigidos por la ley.

El reporte cuenta con un disclaimer indicando el carácter orientativo de la auditoría.

Consideración Técnica: Añadir lógica algorítmica en React para procesar el peso de las vulnerabilidades y renderizar componentes visuales de alerta cuando el score caiga por debajo del umbral recomendado.