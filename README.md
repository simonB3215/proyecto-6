# 🛡️ Aegis CyberAudit (B2B SaaS Platform)

Aegis CyberAudit (antes "Antigravity") es una plataforma SaaS B2B premium diseñada para automatizar auditorías de ciberseguridad. Permite a las empresas identificar vulnerabilidades en sus aplicaciones web y generar reportes ejecutivos automatizados que mapean los hallazgos con los controles normativos de la **ISO 27001**.

---

## ✨ ¿Qué hace esta plataforma? (Flujo de Usuario)

La plataforma ofrece una experiencia de usuario fluida y segura (Tenant Isolation), garantizando que cada empresa solo tenga acceso a su propia información.

1. **Autenticación Segura:** El usuario inicia sesión o se registra a través de Supabase Auth. El sistema asegura automáticamente que sus datos estén aislados del resto de usuarios en la plataforma.
2. **Dashboard de Auditoría:** El usuario ingresa la URL de su objetivo (ej. `https://miempresa.com`) en el "Aegis Console". Existe una protección Anti-SSRF activa que bloquea intentos de escanear direcciones IP internas (como `localhost` o `192.168.x.x`).
3. **Ejecución Asíncrona:** Al lanzar el escáner, el backend recibe la petición y la procesa en segundo plano. La interfaz muestra un indicador de "En progreso" (`in_progress`).
4. **Actualizaciones en Tiempo Real:** Gracias a los WebSockets (Supabase Realtime), la interfaz del usuario se actualiza automáticamente (sin necesidad de recargar la página) cuando el escaneo termina (`completed`) o si ocurre algún error (`failed`).
5. **Generación de Reportes PDF:** Una vez finalizado el escaneo, el backend usa un motor automatizado para clasificar las vulnerabilidades (ej. Inyección SQL, XSS, etc.) y las asocia a su respectivo control de la norma ISO 27001. Luego, genera un reporte ejecutivo en PDF y lo guarda de forma segura en la nube.
6. **Descarga Privada y Segura:** El usuario puede descargar su reporte PDF. Para garantizar la privacidad absoluta, la descarga se hace mediante una URL firmada generada por el backend tras validar el token de sesión, lo que impide que usuarios no autorizados puedan acceder a PDFs ajenos.

---

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto está construido con un stack moderno enfocado en la velocidad, seguridad y una estética premium (Glassmorphism).

### Frontend (Panel de Control)
- **React 18 + Vite:** Single Page Application (SPA) ultra rápida.
- **Tailwind CSS:** Diseño UI/UX premium con efectos de cristal (glassmorphism), paletas de colores oscuros y animaciones dinámicas.
- **Supabase JS:** Integración para autenticación y suscripciones en tiempo real a la base de datos (Postgres Changes).
- **Lucide React:** Iconografía moderna y minimalista.

### Backend (Orquestador API)
- **Node.js + Express:** API REST que maneja la orquestación de los escaneos y la validación de tokens JWT.
- **Mapeo ISO 27001 (`iso27001_mapper`):** Lógica interna que traduce vulnerabilidades técnicas a controles de cumplimiento normativo.
- **PDFKit (`pdf.service`):** Generación dinámica del reporte PDF con estilos corporativos.

### Base de Datos y Storage (BaaS)
- **Supabase (PostgreSQL):** Esquema relacional con políticas de seguridad a nivel de fila (Row Level Security - RLS) para aislar los datos (Tenant Isolation).
- **Supabase Storage:** Buckets privados para alojar los reportes PDF generados de forma confidencial.

---

## 🚀 Cómo ejecutar el proyecto localmente

### 1. Configurar el Backend
```bash
cd backend
npm install
# Renombrar .env.example a .env y colocar las variables de Supabase
npm run dev
```
El backend correrá por defecto en `http://localhost:3000`.

### 2. Configurar el Frontend
```bash
cd frontend
npm install
# Renombrar .env.local.example a .env.local y colocar las variables de Supabase
npm run dev
```
El frontend se levantará por defecto en `http://localhost:5173`.

---

## 🔒 Consideraciones de Seguridad Implementadas
- **Tenant Isolation:** Filtros en Frontend y políticas estrictas RLS en PostgreSQL aseguran que un usuario (`user_id`) solo puede leer y crear escaneos que le pertenezcan.
- **Descargas Firmadas:** Los reportes de auditoría están en un Bucket Privado. El backend verifica la identidad del usuario antes de otorgar una URL temporal para descargar el PDF.
- **Anti-SSRF:** Bloqueo de URLs internas (`127.0.0.1`, IPs locales) en el frontend para evitar abusos de red.
- **Limpieza de Sesión:** Los tokens de autenticación gigantes se eliminan de la URL del navegador automáticamente después de validar la sesión por motivos de estética y seguridad.
