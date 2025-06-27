import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt_utils';
import User from '../../models/User';
import '../../config/database';

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

export class AuthService {
    private static async logAllUsers() {
        const users = await User.findAll({
            attributes: ['id', 'username'], // Exclude password from logs
        });
        console.log('\n=== Current Users in Database During Auth ===');
        console.table(users.map((u) => ({ id: u.id, username: u.username })));
        console.log('================================\n');
    }

    static async register(
        username: string,
        password: string
    ): Promise<AuthResponse> {
        console.log('\n[Register] Attempting to register user:', username);

        if (!username || username.trim().length < 3) {
            console.log('[Register] Error: Invalid username length');
            throw new AuthError(
                'Username must be at least 3 characters long',
                'INVALID_USERNAME'
            );
        }

        if (!password || password.length < 6) {
            console.log('[Register] Error: Invalid password length');
            throw new AuthError(
                'Password must be at least 6 characters long',
                'INVALID_PASSWORD'
            );
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            console.log('[Register] Error: Username already exists');
            throw new AuthError('Username already exists', 'USERNAME_TAKEN');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            username,
            password: hashedPassword,
        });
        console.log(
            '[Register] Successfully registered user:',
            username,
            'with ID:',
            user.id
        );

        await this.logAllUsers();
        return { message: 'User registered successfully' };
    }

    static async login(
        username: string,
        password: string
    ): Promise<AuthResponse> {
        console.log('\n[Login] Attempting login for user:', username);

        // Validate input
        if (!username || !password) {
            console.log('[Login] Error: Missing credentials');
            throw new AuthError(
                'Username and password are required',
                'MISSING_CREDENTIALS'
            );
        }

        // Find user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.log('[Login] Error: User not found');
            throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('[Login] Error: Invalid password');
            throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            username: user.username,
        });

        console.log(
            '[Login] Successful login for user:',
            username,
            'with ID:',
            user.id
        );
        await this.logAllUsers();

        return {
            message: 'Login successful',
            token,
        };
    }

    static async getUserByUsername(username: string): Promise<User | null> {
        console.log('\n[GetUser] Looking up user:', username);
        const user = await User.findOne({ where: { username } });
        if (user) {
            console.log('[GetUser] Found user with ID:', user.id);
        } else {
            console.log('[GetUser] User not found');
        }
        return user;
    }
}

export default AuthService;
