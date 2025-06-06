# FelMart - Sistema de Gestión de Residuos

Sistema web para la gestión de residuos industriales que permite la solicitud, cotización y seguimiento de servicios de recolección y disposición de residuos.

## 🛠️ Tecnologías y Herramientas

### Backend
- **Node.js**: Entorno de ejecución para JavaScript
- **Express**: Framework web para Node.js
- **MySQL**: Base de datos relacional
- **Sequelize**: ORM para manejo de bases de datos
- **EJS**: Motor de plantillas para vistas
- **Bcrypt**: Encriptación de contraseñas
- **Express-session**: Manejo de sesiones
- **Nodemailer**: Envío de correos electrónicos
- **ExcelJS**: Generación de archivos Excel
- **html-pdf**: Generación de documentos PDF
- **Helmet**: Seguridad de encabezados HTTP

### Frontend
- **HTML/CSS/JavaScript**
- **Bootstrap**: Framework CSS para diseño responsivo
- **jQuery**: Biblioteca JavaScript para manipulación del DOM
- **Font Awesome**: Iconos vectoriales
- **FullCalendar**: Para la visualización del calendario de eventos

## 📊 Base de Datos y Relaciones

El sistema utiliza una base de datos MySQL con las siguientes entidades principales:

### Entidades
- **Usuario**: Administradores, operadores y otros usuarios del sistema
- **Cliente**: Empresas que solicitan los servicios de gestión de residuos
- **Residuo**: Catálogo de tipos de residuos que maneja el sistema
- **SolicitudRetiro**: Peticiones de recolección de residuos
- **DetalleResiduo**: Tipos y cantidades de residuos a recolectar
- **Cotizacion**: Presupuestos generados para las solicitudes
- **VisitaRetiro**: Programación de visitas para recolección de residuos
- **Certificado**: Documentos que certifican la disposición adecuada de residuos
- **Notificacion**: Sistema de alertas para usuarios
- **PrecioResiduo**: Gestión de precios de los residuos

### Relaciones Principales
- Un **Usuario** puede gestionar múltiples **Clientes**
- Un **Cliente** puede tener múltiples **SolicitudRetiro**
- Una **SolicitudRetiro** contiene varios **DetalleResiduo**
- Una **SolicitudRetiro** puede tener múltiples **Cotizaciones**
- Una **SolicitudRetiro** puede programar varias **VisitaRetiro**
- Un **Usuario** (operador) puede realizar múltiples **VisitaRetiro**
- Una **VisitaRetiro** puede generar uno o más **Certificados**
- Un **Usuario** recibe múltiples **Notificaciones**

## 🚀 Funciones Principales

### Gestión de Usuarios
- Registro y autenticación de usuarios
- Gestión de perfiles y permisos
- Recuperación de contraseñas

### Gestión de Clientes
- Alta, baja y modificación de clientes
- Historial de servicio por cliente
- Seguimiento de actividad

### Solicitudes de Retiro
- Creación de solicitudes de recolección de residuos
- Especificación de tipos y cantidades de residuos
- Seguimiento de estado de las solicitudes

### Cotizaciones
- Generación automática de cotizaciones basadas en los residuos
- Envío de cotizaciones por correo electrónico
- Exportación a PDF

### Agendamiento de Visitas
- Programación de fechas de recolección
- Asignación de operadores
- Visualización en calendario

### Certificación
- Generación de certificados de disposición final
- Documentación legal de gestión de residuos
- Exportación a PDF

### Reportes y Dashboard
- Estadísticas de operación
- Gráficos de actividad
- Exportación de datos a Excel

## 💼 Casos de Uso

### Para Administradores
- Gestión completa de usuarios, clientes y catálogos
- Visualización de métricas de negocio
- Generación de reportes gerenciales

### Para Operadores
- Visualización de agenda de retiros asignados
- Registro de información de visitas
- Generación de certificados

### Para Clientes
- Solicitud de servicios de recolección
- Seguimiento de sus solicitudes
- Acceso a historial de certificados

## ⚙️ Instalación y Configuración

1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
   - Crear archivo `.env` basado en `.env.example`
   - Configurar conexión a base de datos y otros parámetros

4. Inicializar base de datos
```bash
npm run setup
```

5. Iniciar la aplicación
```bash
npm run dev
```

## 📃 Variables de Entorno

El proyecto requiere las siguientes variables de entorno:

```
# Configuración de la base de datos
DB_HOST=localhost
DB_NAME=felmart_db
DB_USER=usuario
DB_PASS=contraseña

# Configuración del servidor
PORT=3000
NODE_ENV=development
SESSION_SECRET=clave_secreta_sesion

# Configuración de correo electrónico
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=correo@ejemplo.com
EMAIL_PASS=contraseña_correo
``` 