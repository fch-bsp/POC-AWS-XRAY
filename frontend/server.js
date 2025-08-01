// ============================================
// AWS X-Ray Configuration - DEVE SER O PRIMEIRO IMPORT
// ============================================
const AWSXRay = require('aws-xray-sdk-core');
const AWSXRayExpress = require('aws-xray-sdk-express');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// ============================================
// Imports da aplicação
// ============================================
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// ============================================
// Configuração do Express com X-Ray
// ============================================
const app = express();
const port = process.env.PORT || 3000;

// Middleware do X-Ray - DEVE SER O PRIMEIRO MIDDLEWARE
app.use(AWSXRayExpress.openSegment('XRayPOC-Frontend'));

// Middlewares da aplicação
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Configuração do Axios com X-Ray
// ============================================
const capturedAxios = AWSXRay.captureHTTPs(axios);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

// ============================================
// Rotas da aplicação
// ============================================

// Servir página principal
app.get('/', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'home');
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'health');
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'xray-poc-frontend'
  });
});

// Proxy para API - Listar usuários
app.get('/api/users', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('api-call-users');
  
  try {
    subsegment.addAnnotation('operation', 'proxy-get-users');
    subsegment.addAnnotation('api_url', `${API_BASE_URL}/api/users`);
    
    const response = await capturedAxios.get(`${API_BASE_URL}/api/users`);
    
    subsegment.addAnnotation('status', 'success');
    subsegment.addMetadata('response', { 
      status: response.status,
      userCount: response.data.count 
    });
    
    res.json(response.data);
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    console.error('Erro ao buscar usuários:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao conectar com a API'
    });
  } finally {
    subsegment.close();
  }
});

// Proxy para API - Criar usuário
app.post('/api/users', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('api-call-create-user');
  
  try {
    const userData = req.body;
    
    subsegment.addAnnotation('operation', 'proxy-create-user');
    subsegment.addAnnotation('api_url', `${API_BASE_URL}/api/users`);
    subsegment.addMetadata('user_data', userData);
    
    const response = await capturedAxios.post(`${API_BASE_URL}/api/users`, userData);
    
    subsegment.addAnnotation('status', 'success');
    subsegment.addMetadata('response', { 
      status: response.status,
      userId: response.data.data?.id 
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    console.error('Erro ao criar usuário:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao conectar com a API'
      });
    }
  } finally {
    subsegment.close();
  }
});

// Proxy para API - Buscar usuário por ID
app.get('/api/users/:id', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('api-call-user-by-id');
  
  try {
    const { id } = req.params;
    
    subsegment.addAnnotation('operation', 'proxy-get-user-by-id');
    subsegment.addAnnotation('user_id', id);
    subsegment.addAnnotation('api_url', `${API_BASE_URL}/api/users/${id}`);
    
    const response = await capturedAxios.get(`${API_BASE_URL}/api/users/${id}`);
    
    subsegment.addAnnotation('status', 'success');
    subsegment.addMetadata('response', { 
      status: response.status,
      userId: response.data.data?.id 
    });
    
    res.json(response.data);
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    console.error('Erro ao buscar usuário:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao conectar com a API'
      });
    }
  } finally {
    subsegment.close();
  }
});

// Rota para testar erro
app.get('/api/error', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('api-call-error');
  
  try {
    subsegment.addAnnotation('operation', 'proxy-error-test');
    
    const response = await capturedAxios.get(`${API_BASE_URL}/api/error`);
    res.json(response.data);
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', {
      message: error.message,
      status: error.response?.status
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro simulado capturado pelo X-Ray'
    });
  } finally {
    subsegment.close();
  }
});

// ============================================
// Middleware de fechamento do X-Ray - DEVE SER O ÚLTIMO
// ============================================
app.use(AWSXRayExpress.closeSegment());

// ============================================
// Inicialização do servidor
// ============================================
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Frontend rodando na porta ${port}`);
  console.log(`📊 X-Ray tracing ativado`);
  console.log(`🔗 API Backend: ${API_BASE_URL}`);
});
