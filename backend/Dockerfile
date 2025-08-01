FROM node:18-alpine

# Instalar dependências do sistema necessárias para o X-Ray daemon
RUN apk add --no-cache curl

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código da aplicação
COPY . .

# Expor porta da aplicação
EXPOSE 8080

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Mudar ownership dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Comando para iniciar a aplicação
CMD ["npm", "start"]
