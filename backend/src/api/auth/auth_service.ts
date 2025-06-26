import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt_utils';
import { v4 as uuidv4 } from 'uuid';

interface User {
    userId: string;
    username: string;
    password: string;
}

interface AuthResponse {
    message: string;
    token?: string;
}

class AuthError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.code = code;
        this.name = 'AuthError';
    }
}

// Temporary in-memory storage (replace with database)
const users: User[] = [];

export class AuthService {
    static async register(
        username: string,
        password: string
    ): Promise<AuthResponse> {
        // Validate input
        if (!username || username.trim().length < 3) {
            throw new AuthError(
                'Username must be at least 3 characters long',
                'INVALID_USERNAME'
            );
        }

        if (!password || password.length < 6) {
            throw new AuthError(
                'Password must be at least 6 characters long',
                'INVALID_PASSWORD'
            );
        }

        // Check if user exists
        if (users.find((u) => u.username === username)) {
            throw new AuthError('Username already exists', 'USERNAME_TAKEN');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user: User = {
            userId: uuidv4(),
            username,
            password: hashedPassword,
        };
        users.push(user);

        return { message: 'User registered successfully' };
    }

    static async login(
        username: string,
        password: string
    ): Promise<AuthResponse> {
        // Validate input
        if (!username || !password) {
            throw new AuthError(
                'Username and password are required',
                'MISSING_CREDENTIALS'
            );
        }

        // Find user
        const user = users.find((u) => u.username === username);
        if (!user) {
            throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        // Generate token
        const token = generateToken({
            userId: user.userId,
            username: user.username,
        });

        return {
            message: 'Login successful',
            token,
        };
    }

    static async getUserByUsername(
        username: string
    ): Promise<User | undefined> {
        return users.find((u) => u.username === username);
    }
}

export default AuthService;
