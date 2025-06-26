import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

interface CustomError extends Error {
    stack?: string;
    code?: string;
}


export const errorHandler: ErrorRequestHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(`Error: ${err.message}`);
    console.error(`Stack: ${err.stack}`);

    if (err.message === 'Invalid credentials') {
        return res.status(401).json({
            status: 'error',
            code: 'AUTH_FAILED',
            message:
                'The username or password you entered is incorrect. Please try again.',
        });
    }

    if (err.message === 'Username already exists') {
        return res.status(400).json({
            status: 'error',
            code: 'REGISTRATION_FAILED',
            message:
                'This username is already taken. Please choose a different one.',
        });
    }

    if (err.message === 'Invalid token') {
        return res.status(401).json({
            status: 'error',
            code: 'INVALID_TOKEN',
            message: 'Your session has expired. Please log in again.',
        });
    }

    res.status(500).json({
        status: 'error',
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
    });
};
