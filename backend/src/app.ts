import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

app.use(express.json());

// CORS — liberado para desenvolvimento
app.use(cors({
  origin: function (origin, callback) {
    // Em desenvolvimento, permitir qualquer origem
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Em produção, verificar whitelist
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

// Servir o frontend de desenvolvimento (front-dev)
app.use('/front-dev', express.static(path.join(__dirname, '..', 'front-dev')));
app.get('/dev', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'front-dev', 'index.html'));
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
