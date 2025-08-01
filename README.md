# POC AWS X-Ray - Monitoramento Distribuído

Uma aplicação completa demonstrando o uso do AWS X-Ray para rastreamento distribuído em uma arquitetura de microserviços com Node.js, PostgreSQL e AWS ECS.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (Node.js)     │◄──►│   (Node.js)     │◄──►│     (RDS)       │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   AWS X-Ray     │
                    │   Tracing       │
                    └─────────────────┘
```

## 🚀 Funcionalidades

- **Frontend**: Interface web servindo uma SPA com proxy para API
- **Backend**: API REST com operações CRUD de usuários
- **Banco de Dados**: PostgreSQL com dados de exemplo
- **Monitoramento**: Rastreamento completo com AWS X-Ray
- **Infraestrutura**: Deploy automatizado com CloudFormation
- **Containerização**: Docker para frontend e backend

## 📋 Pré-requisitos

- AWS CLI configurado
- Docker instalado
- Node.js 18+ (para desenvolvimento local)
- PostgreSQL (para desenvolvimento local)

## 🛠️ Configuração Local

### 1. Clone e Configure

```bash
git clone <repository-url>
cd App-Xray
cp .env.example .env
```

### 2. Configure PostgreSQL Local

```bash
# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Criar banco e usuário
sudo -u postgres psql
CREATE DATABASE xraypoc;
CREATE USER postgres WITH PASSWORD 'postgres123';
GRANT ALL PRIVILEGES ON DATABASE xraypoc TO postgres;
\q
```

### 3. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Executar Aplicação

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

Acesse: http://localhost:3000

## ☁️ Deploy na AWS

### Deploy Automatizado

```bash
# Configurar permissões AWS
aws configure --profile bedhock

# Executar deploy completo
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Deploy Manual por Etapas

```bash
# 1. Stack de Rede (VPC, Subnets, Security Groups)
aws cloudformation deploy \
  --template-file cloudformation/01-network-stack.yaml \
  --stack-name xray-poc-network \
  --parameter-overrides ProjectName=xray-poc

# 2. Stack de Banco (RDS PostgreSQL)
aws cloudformation deploy \
  --template-file cloudformation/02-database-stack.yaml \
  --stack-name xray-poc-database \
  --parameter-overrides ProjectName=xray-poc NetworkStackName=xray-poc-network

# 3. Build e Push das Imagens
# (Ver scripts/deploy.sh para comandos detalhados)

# 4. Stack de Aplicação (ECS, ALB)
aws cloudformation deploy \
  --template-file cloudformation/03-application-stack.yaml \
  --stack-name xray-poc-application \
  --parameter-overrides ProjectName=xray-poc \
  --capabilities CAPABILITY_IAM
```

## 📊 Monitoramento com X-Ray

### Recursos Implementados

- **Segmentos**: Rastreamento de requisições HTTP
- **Subsegmentos**: Operações de banco e chamadas de API
- **Anotações**: Metadados para filtros e buscas
- **Metadados**: Informações detalhadas para debugging
- **Tratamento de Erros**: Captura e rastreamento de exceções

### Visualização

Acesse o console do X-Ray:
```
https://console.aws.amazon.com/xray/home?region=us-east-1#/traces
```

### Endpoints para Teste

- `GET /health` - Health check
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `GET /api/users/:id` - Buscar usuário por ID
- `GET /api/error` - Simular erro (para demonstração)

## 🏗️ Estrutura do Projeto

```
App-Xray/
├── backend/                 # API Node.js com X-Ray
│   ├── server.js           # Servidor principal
│   ├── package.json        # Dependências
│   └── Dockerfile          # Container backend
├── frontend/               # Frontend Node.js com X-Ray
│   ├── server.js          # Servidor proxy
│   ├── package.json       # Dependências
│   ├── public/            # Arquivos estáticos
│   └── Dockerfile         # Container frontend
├── cloudformation/        # Templates de infraestrutura
│   ├── 01-network-stack.yaml      # VPC e rede
│   ├── 02-database-stack.yaml     # RDS PostgreSQL
│   └── 03-application-stack.yaml  # ECS e ALB
├── scripts/               # Scripts de automação
│   ├── deploy.sh         # Deploy completo
│   └── cleanup.sh        # Limpeza de recursos
├── Doc/                  # Documentação adicional
└── generated-diagrams/   # Diagramas da arquitetura
```

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **AWS X-Ray SDK** - Rastreamento distribuído
- **Docker** - Containerização

### Frontend
- **Node.js** - Servidor proxy
- **Express** - Framework web
- **Axios** - Cliente HTTP
- **AWS X-Ray SDK** - Rastreamento

### Infraestrutura
- **AWS ECS Fargate** - Orquestração de containers
- **AWS RDS** - Banco PostgreSQL gerenciado
- **AWS ALB** - Load balancer
- **AWS VPC** - Rede privada
- **AWS X-Ray** - Monitoramento distribuído
- **CloudFormation** - Infraestrutura como código

## 🧪 Testando a Aplicação

### Criar Usuário
```bash
curl -X POST http://your-alb-dns/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@example.com"}'
```

### Listar Usuários
```bash
curl http://your-alb-dns/api/users
```

### Simular Erro
```bash
curl http://your-alb-dns/api/error
```

## 🔍 Análise de Traces

### Filtros Úteis no X-Ray

```
# Requisições com erro
annotation.status = "error"

# Operações específicas
annotation.operation = "create-user"

# Requisições lentas (>1s)
responsetime > 1
```

### Métricas Importantes

- **Latência**: Tempo de resposta das requisições
- **Taxa de Erro**: Percentual de requisições com falha
- **Throughput**: Número de requisições por segundo
- **Mapa de Serviços**: Visualização das dependências

## 🧹 Limpeza de Recursos

```bash
# Executar script de limpeza
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh

# Ou deletar manualmente
aws cloudformation delete-stack --stack-name xray-poc-application
aws cloudformation delete-stack --stack-name xray-poc-database
aws cloudformation delete-stack --stack-name xray-poc-network
```

## 📚 Documentação Adicional

- [Doc/DOCUMENTACAO_COMPLETA.md](Doc/DOCUMENTACAO_COMPLETA.md) - Documentação técnica detalhada
- [Doc/USAGE.md](Doc/USAGE.md) - Guia de uso da aplicação
- [Doc/APRESENTACAO_EXECUTIVA.md](Doc/APRESENTACAO_EXECUTIVA.md) - Apresentação para executivos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é uma POC (Proof of Concept) para demonstração do AWS X-Ray.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do CloudWatch
2. Consulte os traces no X-Ray Console
3. Revise a documentação na pasta `Doc/`

---

**Desenvolvido para demonstrar as capacidades do AWS X-Ray em arquiteturas de microserviços.**