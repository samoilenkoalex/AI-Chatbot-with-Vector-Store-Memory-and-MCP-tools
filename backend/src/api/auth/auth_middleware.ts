import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt_utils';

interface AuthRequest extends Request {
    user?: {
        userId: string;
        username: string;
    };
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            message: 'Access denied. No token provided.',
        });
        return;
    }

    try {
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                message: 'Invalid token format.',
            });
            return;
        }

        const token = parts[1];
        const verified = verifyToken(token);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
}
