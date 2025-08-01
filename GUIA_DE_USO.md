# 🚀 Guia de Uso - POC AWS X-Ray

## 📋 Como Testar a Aplicação

### 1. **Acessar a Aplicação**

**URL da aplicação**: `http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com`

### 🛣️ **Entendendo o Roteamento**

O Application Load Balancer (ALB) funciona como um "porteiro inteligente" que direciona as requisições:

#### **Frontend (Interface Web)**
```
http://poc.bspprompt.com/
```
- **Destino**: Frontend Node.js (porta 3000)
- **Conteúdo**: Interface web com formulários
- **Acessa Banco**: ❌ Não diretamente

#### **Backend (API)**
```
http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users
http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/error
```
- **Destino**: Backend Express.js (porta 8080)
- **Conteúdo**: API REST em JSON
- **Acessa Banco**: ✅ Sim (quando necessário)

#### **Banco de Dados PostgreSQL**
- **❌ NÃO tem endpoint HTTP direto**
- **Localização**: Subnets privadas (sem acesso à internet)
- **Acesso**: Apenas interno pelo Backend
- **Aparece no X-Ray**: Somente quando usado pelo Backend

### 📊 **Fluxos de Dados**

#### **Fluxo 1: Acessar Interface Web**
```
👤 Cliente → 🌐 ALB (/) → ⚛️ Frontend → 🖥️ Interface HTML
```

#### **Fluxo 2: Listar Usuários (Banco APARECE no X-Ray)**
```
👤 Cliente → 🌐 ALB (/api/users) → ⚙️ Backend → 🗄️ PostgreSQL
                                        ↓
                                   SELECT * FROM users
```

#### **Fluxo 3: Simular Erro (Banco NÃO APARECE no X-Ray)**
```
👤 Cliente → 🌐 ALB (/api/error) → ⚙️ Backend → 💥 ERRO (linha 237)
                                        ↓
                                   ❌ NÃO chega no banco
```

## 🏗️ Arquitetura Implementada

![Arquitetura](./generated-diagrams/xray-poc-architecture.png)


### 2. **Interface Web**

A aplicação possui uma interface web simples com:

- **📋 Lista de Usuários**: Visualizar usuários cadastrados
- **➕ Criar Usuário**: Formulário para adicionar novos usuários
- **🔍 Buscar por ID**: Buscar usuário específico
- **❌ Simular Erro**: Testar captura de erros pelo X-Ray

### 3. **Endpoints da API**

#### **Backend (API)**
```
http://poc.bspprompt.com//api/users
http://poc.bspprompt.com//api/error
```




#### 📊 **Resumo dos Endpoints**

| URL | Destino | Acessa Banco? | Aparece no X-Ray? |
|-----|---------|---------------|-------------------|
| `/` | Frontend | ❌ Não | Frontend apenas |
| `/api/users` (GET) | Backend | ✅ Sim (SELECT) | Frontend + Backend + PostgreSQL |
| `/api/users` (POST) | Backend | ✅ Sim (INSERT) | Frontend + Backend + PostgreSQL |
| `/api/users/:id` | Backend | ✅ Sim (SELECT) | Frontend + Backend + PostgreSQL |
| `/api/error` | Backend | ❌ Não (erro antes) | Frontend + Backend (PostgreSQL NÃO aparece) |

#### **GET /api/users** - Listar usuários
```bash
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users
ou 
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users
```

#### **POST /api/users** - Criar usuário
```bash
curl -X POST http://poc.bspprompt.com//api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@teste.com"}'
```

#### **GET /api/users/:id** - Buscar usuário
```bash
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users/1
```

#### **GET /api/error** - Simular erro
```bash
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/error
```

---

## 📊 Visualizando Traces no X-Ray

### 1. **Acessar o Console X-Ray**
1. Abra o [AWS Console](https://console.aws.amazon.com)
2. Navegue para **X-Ray** > **Service Map**
3. Selecione região **us-east-1**

### 2. **Service Map**
- Visualize a arquitetura da aplicação
- Veja latência média de cada serviço
- Identifique gargalos e erros

### 3. **Traces**
- Clique em **Traces** no menu lateral
- Filtre por:
  - **Time range**: Últimos 5 minutos
  - **Service**: XRayPOC-Frontend ou XRayPOC-Backend
  - **Response time**: > 1 segundo
  - **Errors**: Apenas traces com erro

### 4. **Análise Detalhada**
- Clique em um trace específico
- Veja timeline detalhada
- Analise subsegments de banco de dados
- Examine annotations e metadata

---

## 🧪 Cenários de Teste

### **Cenário 1: Operação Normal**
```bash
# 1. Listar usuários existentes
curl http://[ALB-DNS]/api/users

# 2. Criar novo usuário
curl -X POST http://[ALB-DNS]/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Maria Santos", "email": "maria@exemplo.com"}'

# 3. Buscar usuário criado
curl http://[ALB-DNS]/api/users/4
```

**No X-Ray**: Veja trace completo com 3 operações

### **Cenário 2: Teste de Erro**
```bash
# Simular erro na aplicação
curl http://[ALB-DNS]/api/error
```

**No X-Ray**: Trace marcado como erro com stack trace

### **Cenário 3: Teste de Carga**
```bash
# Gerar múltiplas requisições
for i in {1..10}; do
  curl http://[ALB-DNS]/api/users &
done
wait
```

**No X-Ray**: Múltiplos traces simultâneos

### **Cenário 4: Teste de Latência**
```bash
# Criar usuário com email duplicado (erro de validação)
curl -X POST http://[ALB-DNS]/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@example.com"}'
```

**No X-Ray**: Trace com erro de constraint do banco

---

## 📈 Métricas para Monitorar

### **Performance**
- **Response Time**: < 500ms para operações normais
- **Database Query Time**: < 100ms
- **Error Rate**: < 1%

### **Throughput**
- **Requests/Second**: Capacidade atual ~100 RPS
- **Concurrent Users**: Suporte para ~50 usuários simultâneos

### **Availability**
- **Uptime**: 99.9% target
- **Health Check**: ALB monitora saúde dos containers

---

## 🔍 Troubleshooting

### **Problema: Aplicação não responde**
1. Verificar status dos serviços ECS
2. Checar logs no CloudWatch
3. Verificar health checks do ALB

```bash
# Verificar serviços ECS
aws ecs describe-services --profile bedhock --region us-east-1 \
  --cluster xray-poc-cluster --services xray-poc-frontend xray-poc-backend
```

### **Problema: Traces não aparecem no X-Ray**
1. Verificar permissões IAM
2. Checar se X-Ray daemon está rodando
3. Verificar configuração do SDK

```bash
# Verificar logs do X-Ray daemon
aws logs get-log-events --profile bedhock --region us-east-1 \
  --log-group-name "/ecs/xray-poc-xray" \
  --log-stream-name [STREAM-NAME]
```

### **Problema: Erro de conexão com banco**
1. Verificar security groups
2. Checar status do RDS
3. Verificar string de conexão

```bash
# Verificar status do RDS
aws rds describe-db-instances --profile bedhock --region us-east-1 \
  --db-instance-identifier xray-poc-database
```

---

## 🛠️ Comandos Úteis

### **Monitoramento**
```bash
# Status dos serviços
aws ecs list-services --profile bedhock --region us-east-1 --cluster xray-poc-cluster

# Logs do backend
aws logs tail --profile bedhock --region us-east-1 /ecs/xray-poc-backend --follow

# Logs do frontend
aws logs tail --profile bedhock --region us-east-1 /ecs/xray-poc-frontend --follow

# Métricas do ALB
aws cloudwatch get-metric-statistics --profile bedhock --region us-east-1 \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/xray-poc-alb/[ID] \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T01:00:00Z \
  --period 300 \
  --statistics Sum
```

### **Deployment**
```bash
# Forçar novo deployment
aws ecs update-service --profile bedhock --region us-east-1 \
  --cluster xray-poc-cluster \
  --service xray-poc-backend \
  --force-new-deployment

# Escalar serviços
aws ecs update-service --profile bedhock --region us-east-1 \
  --cluster xray-poc-cluster \
  --service xray-poc-backend \
  --desired-count 3
```

---

## 📊 Dashboard Personalizado

### **CloudWatch Dashboard**
Crie um dashboard personalizado com:

1. **ECS Metrics**:
   - CPU Utilization
   - Memory Utilization
   - Task Count

2. **ALB Metrics**:
   - Request Count
   - Response Time
   - Error Rate

3. **RDS Metrics**:
   - Database Connections
   - Query Performance
   - CPU/Memory Usage

4. **X-Ray Metrics**:
   - Trace Count
   - Error Rate
   - Response Time Distribution

### **Alertas Recomendados**
```bash
# Alerta de alta latência
aws cloudwatch put-metric-alarm --profile bedhock --region us-east-1 \
  --alarm-name "XRay-High-Latency" \
  --alarm-description "Alert when response time > 1s" \
  --metric-name ResponseTime \
  --namespace AWS/X-Ray \
  --statistic Average \
  --period 300 \
  --threshold 1.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## 🎯 Próximos Testes

### **Testes Avançados**
1. **Load Testing**: Usar ferramentas como Artillery ou JMeter
2. **Chaos Engineering**: Simular falhas de componentes
3. **Performance Testing**: Medir limites de throughput
4. **Security Testing**: Validar configurações de segurança

### **Integração com CI/CD**
1. **Automated Testing**: Testes automatizados com validação X-Ray
2. **Deployment Monitoring**: Monitorar deployments com X-Ray
3. **Rollback Automation**: Rollback baseado em métricas X-Ray

---

## 📞 Suporte

### **Logs Importantes**
- **Frontend**: `/ecs/xray-poc-frontend`
- **Backend**: `/ecs/xray-poc-backend`
- **X-Ray Daemon**: `/ecs/xray-poc-xray`

### **Recursos Úteis**
- **AWS X-Ray Console**: https://console.aws.amazon.com/xray/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/
- **ECS Console**: https://console.aws.amazon.com/ecs/

### **Contatos**
- **Equipe DevOps**: [email]
- **Arquiteto de Soluções**: [email]
- **AWS Support**: Caso Premium Support

---

*Guia atualizado em: $(date)*  
*Versão: 1.0*  
*Status: ✅ Aplicação Funcionando*
