import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth_service';

interface AuthRequest extends Request {
    user?: {
        userId: string;
        username: string;
    };
}

class AuthController {
    async register(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({
                    message: 'Username and password are required.',
                });
                return;
            }

            const result = await AuthService.register(username, password);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async login(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({
                    message: 'Username and password are required.',
                });
                return;
            }

            const result = await AuthService.login(username, password);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getProtected(req: AuthRequest, res: Response): Promise<void> {
        res.json({
            message: `Welcome ${req.user?.username}! This is a protected route.`,
            user: req.user,
        });
    }
}

export default new AuthController();
