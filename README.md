# 🛠️ MaintTrac - Sistema de Gestión de Mantenimientos para Tiendas

MaintTrac es una plataforma web corporativa diseñada para centralizar, gestionar y auditar las solicitudes de mantenimiento preventivo y correctivo de la red de tiendas de **Marathon Sports** en Ecuador (Quito, Guayaquil, Cuenca, Manta). 

Esta aplicación está desarrollada con un frontend moderno en **React (Vite + TypeScript)**, estilos limpios mediante **CSS nativo**, y un backend en la nube utilizando **Supabase (PostgreSQL)** para base de datos, almacenamiento de evidencias y logs.

---

## 🚀 Guía de Inicio Rápido (Desde el Principio)

### Paso 1: Requisitos Previos
Asegúrate de tener instalado **Node.js** (versión 18 o superior) en tu computadora. Puedes verificarlo abriendo una terminal y ejecutando:
```bash
node -v
npm -v
```

### Paso 2: Instalación de Dependencias
Abre una terminal dentro de la carpeta del proyecto (`C:\Users\User\.gemini\antigravity\scratch\gestion-mantenimientos`) y ejecuta:
```bash
npm install
```
*Este comando instalará todas las librerías necesarias, incluyendo `@supabase/supabase-js` para la conexión de datos.*

### Paso 3: Configuración de Base de Datos en Supabase
El backend ya está completamente configurado y enlazado. Si deseas recrear o auditar la base de datos:
1. Ve al panel de **[Supabase](https://supabase.com/)** en tu navegador.
2. Ingresa al proyecto `svsxguakbmxjsorcpipy`.
3. Ve a la sección **SQL Editor**.
4. Ejecuta el archivo **[schema.sql](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/schema.sql)** para crear las tablas de base de datos (`tiendas`, `usuarios`, `casos`, `comentarios`, `evidencias`).
5. Ejecuta el archivo **[seed.sql](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/seed.sql)** para sembrar los datos iniciales de tiendas y usuarios de prueba.

### Paso 4: Configuración de Variables de Entorno
En la raíz de este proyecto encontrarás el archivo **[.env](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/.env)**, el cual ya contiene tus credenciales de Supabase en producción:
```env
VITE_SUPABASE_URL=https://svsxguakbmxjsorcpipy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_jxkWFJKtm646gZpzQgOWIg_-XfOCXyM
```

### Paso 5: Ejecutar en Desarrollo
Para iniciar la aplicación en tu computadora localmente, ejecuta:
```bash
npm run dev
```
La terminal te dará una URL (generalmente `http://localhost:5173`). Ábrela en tu navegador para interactuar con el sistema conectado a Supabase.

---

## 👥 Cuentas de Acceso Rápido (Pruebas / Demo)

Para presentar los diferentes roles de la aplicación, puedes ingresar con las siguientes credenciales (o usar los **botones de acceso rápido** de la pantalla de login):

| Rol / Cargo | Usuario de Acceso | Contraseña | Tienda Asignada |
| :--- | :--- | :--- | :--- |
| **Jefe de Tienda** | `jefe.tienda01` | `Jefe#2026Test` | Marathon CCI (Quito) |
| **Jefe de Tienda** | `jefe.tienda02` | `Jefe#2026Test` | Marathon Mall del Sol (Gye) |
| **Técnico Mantenimiento** | `mantenimiento01` | `Mant#2026Test` | Multitienda / Red Nacional |
| **Supervisor Operaciones** | `supervisor01` | `Super#2026Test` | Supervisa todas las tiendas |
| **Administrador Total** | `admin01` | `Admin#2026Test` | Panel de Control CRUD |

---

## 📁 Estructura de Entregables del Proyecto

* **[App.tsx](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/src/App.tsx):** Lógica central de navegación, vistas de dashboard, detalle de tickets, comentarios y panel CRUD del administrador.
* **[index.css](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/src/index.css):** Sistema de diseño premium con variables HSL, badges, tipografía personalizada y soporte completo de temas (Modo Claro / Oscuro).
* **[supabaseClient.ts](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/src/supabaseClient.ts):** Inicializador del SDK de Supabase para comunicación asíncrona.
* **[schema.sql](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/schema.sql):** Diseño relacional en SQL de la base de datos (con índices de rendimiento).
* **[seed.sql](file:///C:/Users/User/.gemini/antigravity/scratch/gestion-mantenimientos/seed.sql):** Datos de prueba listos para ejecutar.
