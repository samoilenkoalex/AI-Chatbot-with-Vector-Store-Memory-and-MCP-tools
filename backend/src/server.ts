import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PORT } from './config/config';
import app from './app';

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Try opening: http://localhost:${PORT}`);
});
