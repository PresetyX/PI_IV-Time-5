# Autor: Bruno Terra Silverio
# RA: 25022630
# Etapa 1: instala as dependências e gera o site com o Rsbuild
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# Endereço do backend, gravado no site na hora do build
ARG PUBLIC_API_URL=http://localhost:8080
ENV PUBLIC_API_URL=$PUBLIC_API_URL
RUN npm run build

# Etapa 2: o nginx serve os arquivos estáticos gerados
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
