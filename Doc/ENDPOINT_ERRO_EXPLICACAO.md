# 🚨 Endpoint de Erro - Como Funciona

## 📍 Endpoint Implementado

**URL**: `GET /api/error`  
**Propósito**: Demonstrar como o AWS X-Ray captura e rastreia erros em aplicações distribuídas

## 🔧 Implementação Técnica

### **Código no Backend** (`server.js` linha ~237)

```javascript
// Rota para simular erro (para demonstração do X-Ray)
app.get('/api/error', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'error-simulation');
  
  // Simular erro para demonstração
  throw new Error('Erro simulado para demonstração do X-Ray');
});
```

### **O que Acontece Quando Chamado**

1. **📥 Requisição Recebida**: ALB roteia para o backend
2. **🏷️ X-Ray Annotation**: Marca o segment como 'error-simulation'
3. **💥 Erro Lançado**: `throw new Error()` é executado
4. **📊 X-Ray Captura**: O erro é automaticamente capturado pelo X-Ray SDK
5. **📝 Log Gerado**: Stack trace completo é enviado para CloudWatch
6. **🔄 Response**: Express retorna HTTP 500 Internal Server Error

## 🧪 Testando o Endpoint

### **Comando cURL**
```bash
curl -v http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/error
```

### **Resposta Esperada**
```
HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Internal Server Error</pre>
</body>
</html>
```

## 📊 O que o X-Ray Captura

### **1. Trace Information**
- **Trace ID**: Identificador único da requisição
- **Segment ID**: ID do segmento do backend
- **Status**: ERROR (marcado como erro)
- **Duration**: Tempo total da operação
- **Timestamp**: Quando o erro ocorreu

### **2. Error Details**
- **Exception Type**: `Error`
- **Error Message**: "Erro simulado para demonstração do X-Ray"
- **Stack Trace**: Localização exata do erro no código
- **HTTP Status**: 500

### **3. Annotations**
- **endpoint**: "error-simulation"
- **service**: "XRayPOC-Backend"
- **status**: "error"

### **4. Metadata**
- **Request Details**: Headers, método HTTP, URL
- **Response Details**: Status code, response time
- **Environment**: Container ID, task definition

## 📈 Visualização no X-Ray Console

### **Service Map**
- O serviço backend aparece **vermelho** indicando erro
- Percentual de erro é atualizado
- Latência média pode ser afetada

### **Trace Details**
- Timeline mostra onde o erro ocorreu
- Stack trace completo disponível
- Correlação com outros serviços na requisição

### **Filtros Úteis**
```
# Buscar apenas traces com erro
http.response.status = 5xx

# Buscar por annotation específica
annotation.endpoint = "error-simulation"

# Buscar por service específico
service("XRayPOC-Backend")
```

## 🔍 Logs no CloudWatch

### **Log Entry Exemplo**
```
Error: Erro simulado para demonstração do X-Ray
    at /app/server.js:237:9
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/app/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at /app/node_modules/express/lib/router/index.js:284:15
    at Function.process_params (/app/node_modules/express/lib/router/index.js:346:12)
    at next (/app/node_modules/express/lib/router/index.js:280:10)
    at jsonParser (/app/node_modules/body-parser/lib/types/json.js:113:7)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
```

### **Comando para Ver Logs**
```bash
aws logs get-log-events --profile bedhock --region us-east-1 \
  --log-group-name "/ecs/xray-poc-backend" \
  --log-stream-name [STREAM-NAME] \
  --start-time $(date -d '5 minutes ago' +%s)000
```

## 🎯 Cenários de Demonstração

### **1. Erro Simples**
```bash
# Gerar um erro único
curl http://[ALB-DNS]/api/error
```
**No X-Ray**: Trace único marcado como erro

### **2. Múltiplos Erros**
```bash
# Gerar múltiplos erros para ver padrão
for i in {1..5}; do
  curl http://[ALB-DNS]/api/error
  sleep 1
done
```
**No X-Ray**: Múltiplos traces de erro, aumento na taxa de erro

### **3. Erro vs Sucesso**
```bash
# Misturar requisições com sucesso e erro
curl http://[ALB-DNS]/api/users        # Sucesso
curl http://[ALB-DNS]/api/error        # Erro
curl http://[ALB-DNS]/api/users        # Sucesso
```
**No X-Ray**: Comparação clara entre traces com sucesso e erro

## 📊 Métricas Afetadas

### **Service Map**
- **Error Rate**: Aumenta conforme erros são gerados
- **Response Time**: Pode ser afetado pelos erros
- **Health Status**: Serviço pode aparecer como degradado

### **CloudWatch Metrics**
- **HTTP 5xx Count**: Incrementa a cada erro
- **Error Rate**: Percentual de requisições com erro
- **Latency**: Tempo de resposta das requisições

## 🛠️ Casos de Uso Reais

### **1. Debugging de Produção**
- Identificar onde erros estão ocorrendo
- Correlacionar erros com outras operações
- Analisar padrões de erro ao longo do tempo

### **2. Monitoramento Proativo**
- Alertas baseados em taxa de erro
- Detecção de degradação de serviço
- Análise de impacto de deployments

### **3. Análise de Performance**
- Comparar latência de operações com/sem erro
- Identificar gargalos que causam timeouts
- Otimizar handling de exceções

## 🚨 Alertas Recomendados

### **CloudWatch Alarm para Taxa de Erro**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "XRay-High-Error-Rate" \
  --alarm-description "Alert when error rate > 5%" \
  --metric-name ErrorRate \
  --namespace AWS/X-Ray \
  --statistic Average \
  --period 300 \
  --threshold 5.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### **SNS Notification**
```bash
# Configurar notificação por email/SMS quando erro ocorrer
aws sns create-topic --name xray-error-alerts
aws sns subscribe --topic-arn [TOPIC-ARN] --protocol email --notification-endpoint admin@empresa.com
```

## 🔧 Melhorias Possíveis

### **1. Diferentes Tipos de Erro**
```javascript
// Erro de validação
app.get('/api/error/validation', (req, res) => {
  const error = new Error('Dados inválidos fornecidos');
  error.statusCode = 400;
  throw error;
});

// Erro de timeout
app.get('/api/error/timeout', (req, res) => {
  setTimeout(() => {
    throw new Error('Operação expirou');
  }, 5000);
});

// Erro de banco de dados
app.get('/api/error/database', async (req, res) => {
  try {
    await pool.query('SELECT * FROM tabela_inexistente');
  } catch (error) {
    throw new Error('Erro de conexão com banco de dados');
  }
});
```

### **2. Metadata Adicional**
```javascript
app.get('/api/error', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'error-simulation');
  segment.addAnnotation('error_type', 'intentional');
  segment.addMetadata('request_info', {
    user_agent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  throw new Error('Erro simulado para demonstração do X-Ray');
});
```

## 📞 Troubleshooting

### **Problema: Erro não aparece no X-Ray**
1. Verificar se X-Ray SDK está configurado corretamente
2. Checar permissões IAM para X-Ray
3. Verificar se X-Ray daemon está rodando

### **Problema: Stack trace incompleto**
1. Verificar configuração de source maps
2. Checar se error handling middleware está configurado
3. Verificar logs do CloudWatch para detalhes completos

---

## 🎯 Conclusão

O endpoint `/api/error` é uma ferramenta poderosa para demonstrar as capacidades do AWS X-Ray em:

✅ **Capturar erros** automaticamente  
✅ **Correlacionar** erros com traces  
✅ **Fornecer contexto** detalhado para debugging  
✅ **Alertar** sobre problemas em tempo real  
✅ **Analisar padrões** de erro ao longo do tempo  

É uma demonstração prática de como o X-Ray transforma o troubleshooting de reativo para proativo.

---

*Documentação atualizada em: $(date)*  
*Endpoint testado e funcionando: ✅*
