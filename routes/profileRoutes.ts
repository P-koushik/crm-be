import express from 'express';
import { updateProfile, getProfile, deleteUser } from '../controllers/userController';
import authMiddleware from '../authMiddleware';

const profilerouter = express.Router();

profilerouter.put('/profile', authMiddleware, updateProfile);
profilerouter.get('/profile', authMiddleware, getProfile);
profilerouter.delete('/profile', authMiddleware, deleteUser);

export default profilerouter;