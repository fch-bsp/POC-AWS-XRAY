# 📋 Cheat Sheet - Apresentação Cliente

## 🔗 URLs Importantes
```
Aplicação: http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com
X-Ray Console: https://console.aws.amazon.com/xray/ (us-east-1)
```

## 🧪 Comandos de Teste

### ✅ Criar Usuário (Banco APARECE)
```bash
curl -X POST http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo Cliente", "email": "demo@cliente.com"}'
```

### 📋 Listar Usuários (Banco APARECE)
```bash
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/users
```

### ❌ Simular Erro (Banco NÃO APARECE)
```bash
curl http://xray-poc-alb-180706144.us-east-1.elb.amazonaws.com/api/error
```

## 🎯 Roteiro de Demonstração

### **1. Mostrar X-Ray Limpo** (30 seg)
- Abrir X-Ray Console
- Mostrar Service Map vazio
- **Falar**: "Vamos ver o que acontece quando fazemos uma operação"

### **2. Criar Usuário** (2 min)
- Executar comando curl
- Atualizar X-Ray (F5)
- **Mostrar**: 4 componentes (ALB, Frontend, Backend, PostgreSQL)
- **Explicar**: "Viu? Banco apareceu porque foi usado"
- Clicar no trace
- **Mostrar**: Timeline detalhada
- **Explicar**: "200ms total, 30ms no banco fazendo INSERT"

### **3. Simular Erro** (2 min)
- Executar comando de erro
- Atualizar X-Ray (F5)
- **Mostrar**: Backend vermelho, só 3 componentes
- **Explicar**: "Banco não aparece porque erro aconteceu antes"
- Clicar no trace de erro
- **Mostrar**: Stack trace linha 237
- **Explicar**: "30 segundos para saber onde e por quê"

### **4. Comparar Traces** (1 min)
- Mostrar trace verde (sucesso)
- Mostrar trace vermelho (erro)
- **Explicar**: "Sistema é inteligente, só mostra o que foi usado"

## 💬 Frases Prontas

### **Abertura**
> "Vou mostrar como o X-Ray dá visibilidade total da sua aplicação em tempo real"

### **Quando Banco Aparece**
> "Viu como o PostgreSQL apareceu automaticamente? Isso significa que houve interação real com o banco"

### **Quando Banco NÃO Aparece**
> "Reparem que o banco não aparece no erro. Por quê? Porque o problema aconteceu antes de chegar lá"

### **Sobre o Stack Trace**
> "Em 30 segundos vocês sabem: linha 237, arquivo server.js, erro simulado. Antes levava horas"

### **Fechamento**
> "Isso transforma sua operação de reativa para proativa. Vocês param de apagar incêndio"

## 🎯 Perguntas Frequentes - Respostas Prontas

### **"Isso impacta performance?"**
> "Menos de 1% de overhead. O ganho em produtividade compensa 1000x"

### **"Funciona com nossa stack atual?"**
> "X-Ray tem SDKs para Java, .NET, Python, Node.js. Se roda na AWS, funciona"

### **"E o custo?"**
> "Para 100 mil requisições por dia: ~$15/mês. Uma hora de troubleshooting custa mais"

### **"Como implementar?"**
> "2 semanas para ter visibilidade total. Começamos pelas aplicações críticas"

## 📊 Números de Impacto

- **83% redução** no tempo de troubleshooting
- **30 segundos** para encontrar root cause
- **100% visibilidade** das requisições
- **$15/mês** para 100k requisições
- **ROI 6000%** em 12 meses

## 🚨 Se Algo Der Errado

### **Aplicação não responde**
- Verificar se serviços ECS estão rodando
- Usar URL alternativa se necessário
- Mostrar logs no CloudWatch como backup

### **X-Ray não mostra traces**
- Aguardar 30-60 segundos (delay normal)
- Verificar filtro de tempo (últimos 5 minutos)
- Atualizar página (F5)

### **Comando curl falha**
- Usar interface web como alternativa
- Mostrar traces existentes como exemplo
- Focar na explicação conceitual

## 🎯 Objetivos da Apresentação

### **Primário**
- [ ] Cliente entende o valor do X-Ray
- [ ] Cliente vê funcionamento prático
- [ ] Cliente quer implementar

### **Secundário**
- [ ] Demonstrar expertise técnica
- [ ] Mostrar solução robusta
- [ ] Gerar confiança na proposta

## 📱 Backup - Screenshots

Se a demo ao vivo falhar, ter screenshots de:
- Service Map com 4 componentes (sucesso)
- Service Map com 3 componentes (erro)
- Trace timeline detalhada
- Stack trace do erro

---

**🎯 Lembre-se:**
- Falar devagar e explicar cada passo
- Fazer pausas para perguntas
- Focar no valor de negócio, não só na tecnologia
- Terminar sempre com próximos passos claros

**⏰ Tempo Total:** 10-15 minutos de demo + 5-10 minutos de perguntas
