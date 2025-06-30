import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
    };
}

export const verifyToken = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res
            .status(401)
            .json({ message: 'Access Denied - No token provided' });
    }

    // Check if the header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
        return res
            .status(401)
            .json({ message: 'Access Denied - Invalid token format' });
    }

    // Extract the token (remove 'Bearer ' prefix)
    const token = authHeader.slice(7);

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified as { id: string; username: string };
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid Token' });
    }
};
