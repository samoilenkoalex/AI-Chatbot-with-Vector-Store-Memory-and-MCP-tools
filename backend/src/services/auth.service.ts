import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/config';
import User from '../models/user.model';

export class AuthService {
    async register(
        username: string,
        password: string
    ): Promise<{ message: string }> {
        try {
            // Check if user already exists
            console.log('Checking if user exists:', username);
            const existingUser = await User.findOne({ where: { username } });

            if (existingUser) {
                console.log('User already exists:', username);
                throw new Error('Username already exists');
            }

            // Hash password
            console.log('Hashing password for user:', username);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            console.log('Creating new user:', username);
            const newUser = await User.create({
                username,
                password: hashedPassword,
            });

            console.log('User created successfully:', newUser.id);
            return { message: 'User registered successfully' };
        } catch (error) {
            console.error('Error in register:', error);
            throw error;
        }
    }

    async login(
        username: string,
        password: string
    ): Promise<{ token: string }> {
        try {
            // Find user
            console.log('Attempting to find user:', username);
            const user = await User.findOne({ where: { username } });

            if (!user) {
                console.log('User not found:', username);
                throw new Error('Invalid credentials');
            }

            // Verify password
            console.log('Verifying password for user:', username);
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                console.log('Invalid password for user:', username);
                throw new Error('Invalid credentials');
            }

            // Create and sign JWT
            console.log('Creating JWT token for user:', username);
            const token = jwt.sign(
                { id: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            console.log('Login successful for user:', username);
            return { token };
        } catch (error) {
            console.error('Error in login:', error);
            throw error;
        }
    }
}
