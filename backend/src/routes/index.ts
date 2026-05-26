import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API Vagoneteiros rodando!' });
});

router.use('/auth', authRoutes);

export default router;
