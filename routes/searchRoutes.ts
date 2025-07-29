import express from 'express';
import authMiddleware from '../authMiddleware';
import { search } from '../controllers/searchController';

const searchrouter = express.Router();

searchrouter.get('/', authMiddleware, search);

export default searchrouter;