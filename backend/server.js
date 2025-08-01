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
const { Pool } = require('pg');
require('dotenv').config();

// ============================================
// Configuração do Express com X-Ray
// ============================================
const app = express();
const port = process.env.PORT || 8080;

// Middleware do X-Ray - DEVE SER O PRIMEIRO MIDDLEWARE
app.use(AWSXRayExpress.openSegment('XRayPOC-Backend'));

// Middlewares da aplicação
app.use(cors());
app.use(express.json());

// ============================================
// Configuração do PostgreSQL com X-Ray
// ============================================
const AWSXRayPostgres = require('aws-xray-sdk-postgres');
const capturedPg = AWSXRayPostgres(require('pg'));

const pool = new capturedPg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'xraypoc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================
// Inicialização do banco de dados
// ============================================
async function initDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados...');
    
    // Criar tabela de usuários se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir dados de exemplo se a tabela estiver vazia
    const result = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (name, email) VALUES 
        ('João Silva', 'joao@example.com'),
        ('Maria Santos', 'maria@example.com'),
        ('Pedro Oliveira', 'pedro@example.com')
      `);
      console.log('✅ Dados de exemplo inseridos');
    }

    console.log('✅ Banco de dados inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  }
}

// ============================================
// Rotas da API
// ============================================

// Health check
app.get('/health', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'health');
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'xray-poc-backend'
  });
});

// Listar usuários
app.get('/api/users', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('get-users');
  
  try {
    subsegment.addAnnotation('operation', 'list-users');
    
    // Simular um pequeno delay para visualizar melhor no X-Ray
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    
    subsegment.addAnnotation('user_count', result.rows.length);
    subsegment.addMetadata('query_result', { count: result.rows.length });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', error.message);
    
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  } finally {
    subsegment.close();
  }
});

// Criar usuário
app.post('/api/users', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('create-user');
  
  try {
    const { name, email } = req.body;
    
    subsegment.addAnnotation('operation', 'create-user');
    subsegment.addMetadata('user_data', { name, email });
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Nome e email são obrigatórios'
      });
    }

    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    
    subsegment.addAnnotation('status', 'success');
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', error.message);
    
    console.error('Erro ao criar usuário:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({
        success: false,
        error: 'Email já existe'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  } finally {
    subsegment.close();
  }
});

// Buscar usuário por ID
app.get('/api/users/:id', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('get-user-by-id');
  
  try {
    const { id } = req.params;
    
    subsegment.addAnnotation('operation', 'get-user-by-id');
    subsegment.addAnnotation('user_id', id);
    
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      subsegment.addAnnotation('status', 'not-found');
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    subsegment.addAnnotation('status', 'success');
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    subsegment.addAnnotation('status', 'error');
    subsegment.addMetadata('error', error.message);
    
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  } finally {
    subsegment.close();
  }
});

// Rota para simular erro (para demonstração do X-Ray)
app.get('/api/error', (req, res) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('endpoint', 'error-simulation');
  
  // Simular erro para demonstração
  throw new Error('Erro simulado para demonstração do X-Ray');
});

// ============================================
// Middleware de fechamento do X-Ray - DEVE SER O ÚLTIMO
// ============================================
app.use(AWSXRayExpress.closeSegment());

// ============================================
// Inicialização do servidor
// ============================================
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
      console.log(`📊 X-Ray tracing ativado`);
      console.log(`🗄️  Conectado ao banco: ${process.env.DB_HOST}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
