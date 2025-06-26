import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './api';
import { errorHandler } from './errors/error_handling';

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

app.use('/auth', express.static(path.join(__dirname, '../public/pages/auth')));
app.use('/main', express.static(path.join(__dirname, '../public/pages/main')));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
    res.redirect('/auth');
});

app.use(errorHandler);

export default app;
