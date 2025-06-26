import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';

interface JwtPayload {
    userId: string;
    username: string;
    [key: string]: any;
}

export function generateToken(payload: JwtPayload): string {
    const signOptions: SignOptions = {
        expiresIn: config.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}
