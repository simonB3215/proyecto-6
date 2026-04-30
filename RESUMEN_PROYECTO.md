# Resumen del Proyecto: Aegis CyberAudit (Plataforma SaaS de Auditoría)

Este documento resume todo el trabajo realizado, la arquitectura establecida y las funcionalidades implementadas en la plataforma de ciberseguridad **Aegis CyberAudit**.

## 🎯 Objetivo del Proyecto
Desarrollo de un MVP (Minimum Viable Product) de una plataforma SaaS B2B diseñada para automatizar auditorías de ciberseguridad, identificar vulnerabilidades en objetivos web y generar reportes ejecutivos mapeados con la normativa **ISO 27001**. 

El proyecto pasó por un rebranding, cambiando su nombre inicial ("Antigravity") a **Aegis Console/CyberAudit** para brindarle un enfoque más profesional y corporativo.

---

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto se divide en tres capas principales fuertemente integradas:

### 1. Base de Datos y Backend as a Service (BaaS) - Supabase
- **PostgreSQL**: Se diseñó un esquema relacional con tres tablas principales:
  - `targets`: Almacena las URLs o IPs registradas por los usuarios a auditar.
  - `scans`: Historial de escaneos y su estado (`pending`, `in_progress`, `completed`, `failed`).
  - `vulnerabilities`: Detalles de las vulnerabilidades encontradas y su mapeo a controles ISO 27001.
- **Seguridad RLS (Row Level Security)**: Políticas estrictas implementadas para garantizar que cada usuario (Tenant) solo pueda acceder, crear y eliminar sus propios objetivos, escaneos y reportes.
- **Storage**: Configuración de un bucket privado (`reports`) con políticas de acceso para almacenar de forma segura los reportes PDF generados.

### 2. Backend (Orquestador de Escaneos)
- **Node.js + Express**: API REST (`/api/scan`) encargada de procesar las solicitudes de escaneo.
- **Procesamiento Asíncrono**: Cuando un usuario lanza un escaneo, la API responde rápidamente con un estado `202 Accepted` y delega la tarea pesada a un proceso en segundo plano (background) para no bloquear la solicitud.
- **Servicio de Escaneo (`scanner.service`)**: Ejecuta la lógica de auditoría en el objetivo.
- **Mapeo ISO 27001 (`iso27001_mapper`)**: Clasifica las vulnerabilidades detectadas asociándolas a controles normativos específicos (ej. A.12.6.1).
- **Generación de PDFs (`pdf.service` usando `pdfkit`)**: Construye un reporte ejecutivo en PDF con los resultados, lo sube al bucket de almacenamiento de Supabase y actualiza el estado del escaneo con la URL del archivo resultante.

### 3. Frontend (Panel de Control y Cliente)
- **React 18 + Vite**: Aplicación Single Page Application (SPA) ultra rápida.
- **Tailwind CSS + Glassmorphism**: Interfaz gráfica premium, dinámica y moderna (colores oscuros, bordes brillantes, efectos de cristal y animaciones sutiles).
- **Supabase Realtime**: Implementación de WebSockets (`schema-db-changes`) para escuchar eventos directamente desde la base de datos PostgreSQL. Esto permite que el estado del escaneo se actualice instantáneamente en la interfaz de usuario (de 'in_progress' a 'completed' o 'failed') sin necesidad de recargar la página.
- **Lucide React**: Uso de iconografía moderna y limpia.

---

## 🚀 Funcionalidades Principales Implementadas

> **Protección Anti-SSRF (Server-Side Request Forgery)**
> Se implementó una validación de seguridad en el Dashboard antes de enviar la URL al backend. Bloquea de forma proactiva intentos de auditar direcciones internas (`localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`), asegurando que la herramienta no pueda ser usada como vector de ataque contra la infraestructura propia.

1. **Autenticación Completa**: Flujo seguro de login/registro manejado por Supabase Auth.
2. **Dashboard de Auditoría (Aegis Console)**:
   - Panel izquierdo para ingresar el objetivo (Target URL) y lanzar el escáner.
   - Panel derecho con el historial de reportes.
3. **Flujo de Escaneo en Tiempo Real**:
   - Al hacer clic en "Lanzar Escáner", se crea un registro en la base de datos y se notifica al backend.
   - El estado en pantalla cambia automáticamente mostrando indicadores de carga.
   - Una vez el backend termina la auditoría y genera el reporte PDF, el estado cambia automáticamente a verde (Completado).
4. **Visor de Reportes PDF**: Botón de acción directo para descargar/visualizar el informe de auditoría alojado de forma segura en la nube.

---

## 📋 Conclusión del Estado Actual

La plataforma ha alcanzado el estado funcional de **MVP Completo**. La integración entre Frontend, Base de Datos (Supabase) y el Backend de Orquestación está validada. El flujo completo —desde la petición de escaneo, el procesamiento asíncrono, la generación de PDFs y las actualizaciones en tiempo real en la vista del usuario— funciona correctamente.
