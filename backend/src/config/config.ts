interface Config {
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRY: string;
}

export const config: Config = {
    PORT: Number(process.env.PORT) || 3000,
    JWT_SECRET:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-this-in-production',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1h',
};

export const { PORT, JWT_SECRET, JWT_EXPIRY } = config;
