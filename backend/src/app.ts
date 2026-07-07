import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import routes from './routes';

const app = express();

app.use(express.json());

// Servir o frontend de desenvolvimento (front-dev)
app.use('/front-dev', express.static(path.join(__dirname, '..', 'front-dev')));
app.get('/dev', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'front-dev', 'index.html'));
});

// Middleware de CORS para permitir requisições do frontend
app.use((req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use('/', routes);

// Middleware global de tratamento de erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
  });
});

export default app;
