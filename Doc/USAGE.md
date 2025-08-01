# 🔍 Guia de Uso - POC AWS X-Ray

## 📋 Pré-requisitos

- AWS CLI configurado com profile `bedhock`
- Docker instalado e rodando
- Permissões AWS necessárias:
  - CloudFormation
  - ECS
  - ECR
  - RDS
  - VPC
  - IAM
  - X-Ray
  - CloudWatch

## 🚀 Deploy da Aplicação

### 1. Deploy Completo
```bash
cd /home/fernando/Documentos/Workshop/App-Xray
./scripts/deploy.sh
```

O script irá:
1. ✅ Criar VPC, subnets, security groups
2. ✅ Criar RDS PostgreSQL
3. ✅ Criar repositórios ECR
4. ✅ Fazer build e push das imagens Docker
5. ✅ Criar ECS cluster, services e ALB
6. ✅ Configurar X-Ray tracing

### 2. Acompanhar o Deploy
- **CloudFormation**: Console AWS > CloudFormation
- **ECS**: Console AWS > ECS > Clusters > xray-poc-cluster
- **RDS**: Console AWS > RDS > Databases

## 🔍 Monitoramento com X-Ray

### Acessar X-Ray Console
```
https://console.aws.amazon.com/xray/home?region=us-east-1#/traces
```

### O que você verá no X-Ray:

#### 1. **Service Map**
- Frontend (Node.js) → Backend (Node.js) → PostgreSQL
- Visualização completa do fluxo de dados
- Latência entre serviços
- Taxa de erro por componente

#### 2. **Traces Detalhados**
- **Frontend traces**: Requisições HTTP, chamadas para API
- **Backend traces**: Endpoints, queries SQL, processamento
- **Database traces**: Operações PostgreSQL com timing

#### 3. **Annotations e Metadata**
- `endpoint`: Qual endpoint foi chamado
- `operation`: Tipo de operação (create-user, get-users, etc.)
- `user_id`: ID do usuário (quando aplicável)
- `status`: success/error
- `user_count`: Número de usuários retornados

## 🧪 Testando a Aplicação

### 1. Acessar a Aplicação
Após o deploy, acesse a URL fornecida:
```
http://[ALB-DNS-NAME]
```

### 2. Funcionalidades Disponíveis

#### **Criar Usuários**
- Preencha nome e email
- Clique em "Criar Usuário"
- ✅ Trace completo: Frontend → Backend → Database

#### **Listar Usuários**
- Clique em "Carregar Usuários"
- ✅ Trace: Frontend → Backend → Database Query

#### **Simular Erro**
- Clique em "Simular Erro"
- ✅ Trace com erro capturado pelo X-Ray

#### **Teste de Carga**
- Clique em "Teste de Carga (10 requisições)"
- ✅ Múltiplos traces simultâneos

### 3. Verificar Traces no X-Ray

1. **Acesse o X-Ray Console**
2. **Service Map**: Veja a arquitetura completa
3. **Traces**: Filtre por:
   - Tempo de resposta > 1s
   - Erros (Response time > 0 AND error)
   - Operações específicas (annotation.operation = "create-user")

## 📊 Pontos de Instrumentação X-Ray

### Frontend (server.js)
```javascript
// ✅ X-Ray configurado no início
const AWSXRay = require('aws-xray-sdk-express');
app.use(AWSXRay.express.openSegment('XRayPOC-Frontend'));

// ✅ Subsegmentos para chamadas API
const subsegment = segment.addNewSubsegment('api-call-users');
subsegment.addAnnotation('operation', 'proxy-get-users');
```

### Backend (server.js)
```javascript
// ✅ X-Ray configurado no início
const AWSXRay = require('aws-xray-sdk-express');
app.use(AWSXRay.express.openSegment('XRayPOC-Backend'));

// ✅ PostgreSQL instrumentado
const AWSXRayPostgres = require('aws-xray-sdk-postgres');
const capturedPg = AWSXRayPostgres(require('pg'));

// ✅ Subsegmentos para operações
const subsegment = segment.addNewSubsegment('get-users');
subsegment.addAnnotation('user_count', result.rows.length);
```

## 🗑️ Cleanup

### Destruir Todos os Recursos
```bash
./scripts/cleanup.sh
```

⚠️ **ATENÇÃO**: Isso irá deletar:
- Todas as stacks CloudFormation
- Repositórios ECR e imagens
- Banco de dados RDS
- Logs do CloudWatch
- Imagens Docker locais

## 🔧 Troubleshooting

### 1. **Erro no Deploy**
```bash
# Verificar logs do CloudFormation
aws cloudformation describe-stack-events --stack-name xray-poc-network --profile bedhock

# Verificar status das stacks
aws cloudformation list-stacks --profile bedhock
```

### 2. **Aplicação não Responde**
```bash
# Verificar status dos serviços ECS
aws ecs describe-services --cluster xray-poc-cluster --services xray-poc-frontend xray-poc-backend --profile bedhock

# Verificar logs dos containers
aws logs get-log-events --log-group-name /ecs/xray-poc-backend --log-stream-name [STREAM-NAME] --profile bedhock
```

### 3. **X-Ray não Mostra Traces**
- Verificar se o X-Ray daemon está rodando nos containers
- Verificar IAM roles (ECSTaskRole deve ter permissões X-Ray)
- Aguardar alguns minutos (pode haver delay)

### 4. **Banco de Dados não Conecta**
```bash
# Verificar status do RDS
aws rds describe-db-instances --db-instance-identifier xray-poc-database --profile bedhock

# Verificar security groups
aws ec2 describe-security-groups --group-names xray-poc-rds-sg --profile bedhock
```

## 📈 Métricas e Observabilidade

### CloudWatch Metrics
- **ECS**: CPU, Memory, Network
- **RDS**: Connections, CPU, Storage
- **ALB**: Request count, Response time

### X-Ray Insights
- **Response Time Distribution**
- **Error Rate Trends**
- **Service Dependencies**
- **Database Query Performance**

## 🎯 Cenários de Demonstração

### 1. **Fluxo Normal**
1. Criar usuário
2. Listar usuários
3. Mostrar trace completo no X-Ray

### 2. **Tratamento de Erro**
1. Simular erro
2. Mostrar como erro aparece no X-Ray
3. Demonstrar debugging com traces

### 3. **Performance**
1. Executar teste de carga
2. Analisar latência no X-Ray
3. Identificar gargalos

### 4. **Monitoramento Contínuo**
1. Configurar alertas no CloudWatch
2. Usar X-Ray para troubleshooting
3. Otimizar baseado em métricas

## 🔗 Links Úteis

- [AWS X-Ray Console](https://console.aws.amazon.com/xray/home?region=us-east-1)
- [ECS Console](https://console.aws.amazon.com/ecs/home?region=us-east-1)
- [CloudFormation Console](https://console.aws.amazon.com/cloudformation/home?region=us-east-1)
- [RDS Console](https://console.aws.amazon.com/rds/home?region=us-east-1)
- [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1)
