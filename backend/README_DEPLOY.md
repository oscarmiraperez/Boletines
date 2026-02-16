# Despliegue Backend GRAVITY

Este documento describe cómo desplegar el backend de la aplicación GRAVITY.

## Requisitos Previos

- **Node.js**: v18 o superior.
- **PostgreSQL**: Base de datos accesible.

## Variables de Entorno

Crear un archivo `.env` en la raíz del backend (o configurar las variables en el panel de control del hosting) con el siguiente contenido:

```env
DATABASE_URL="postgresql://usuario:password@host:port/database?schema=public"
JWT_SECRET="tu_secreto_super_seguro"
PORT=3000
```

## Pasos para Despliegue (Production)

1.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

2.  **Generar Cliente Prisma**:
    ```bash
    npx prisma generate
    ```

3.  **Migrar Base de Datos**:
    Aplicar los cambios de esquema a la base de datos de producción.
    ```bash
    npx prisma migrate deploy
    ```

4.  **Construir (Build)**:
    Compila el código TypeScript a JavaScript (carpeta `dist`).
    ```bash
    npm run build
    ```

5.  **Iniciar Servidor**:
    Ejecuta el servidor compilado.
    ```bash
    npm start
    ```

## Notas Importantes

- **Archivos Estáticos**: El backend espera encontrar las carpetas `templates` y `assets` en el directorio raíz de ejecución (donde se ejecuta `npm start`). Asegúrate de que estas carpetas se copien o estén presentes en el servidor.
- **Docker**: Si usas Docker, asegúrate de copiar también `templates` y `assets` en el Dockerfile.

## Estructura de Directorios Esperada en Producción

```
backend/
├── dist/               # Código compilado
├── node_modules/       # Dependencias
├── prisma/             # Esquema y migraciones
├── templates/          # Plantillas PDF (memoria en blanco.pdf)
├── assets/             # Logos y recursos (logo.png)
├── uploads/            # Directorio para archivos subidos (asegurar persistencia)
├── package.json
└── .env
```
