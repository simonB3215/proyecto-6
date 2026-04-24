# Usamos una imagen de Node.js oficial
FROM node:20-alpine

# Instalar nmap (si quisieramos integrarlo en el futuro) y curl para healthchecks
RUN apk add --no-cache nmap curl

# Crear el directorio de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el código fuente del backend
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
