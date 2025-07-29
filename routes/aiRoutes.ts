import express from 'express';
import { 
  getAvailableModels, 
  getModelStatus, 
  toggleProvider,
  testModel 
} from '../controllers/aiController';
import  authMiddleware  from '../authMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.get('/models', getAvailableModels);

router.get('/models/:modelName/status', getModelStatus);

router.post('/providers/toggle', toggleProvider);

router.post('/models/test', testModel);

export default router; 