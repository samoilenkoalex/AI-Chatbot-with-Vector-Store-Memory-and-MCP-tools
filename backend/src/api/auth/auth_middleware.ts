import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt_utils';

interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = await verifyToken(token);

        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
