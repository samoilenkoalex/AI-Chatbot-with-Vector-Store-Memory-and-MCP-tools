import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                return res
                    .status(400)
                    .json({ message: 'Username and password are required' });
            }

            const result = await authService.register(username, password);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                message:
                    error instanceof Error
                        ? error.message
                        : 'Registration failed',
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                return res
                    .status(400)
                    .json({ message: 'Username and password are required' });
            }

            const result = await authService.login(username, password);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                message:
                    error instanceof Error ? error.message : 'Login failed',
            });
        }
    }

    // Example protected route handler
    async getProfile(req: Request, res: Response) {
        // The user object is attached by the auth middleware
        const user = (req as any).user;
        res.json({
            message: 'Protected route accessed successfully',
            user: {
                id: user.id,
                username: user.username,
            },
        });
    }
}
