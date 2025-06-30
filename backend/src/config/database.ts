import { Sequelize } from 'sequelize';
import path from 'path';

// Create Sequelize instance
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: console.log,
});

// Test database connection
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

// Initialize database (create tables if they don't exist)
export const initializeDatabase = async () => {
    try {
        // Only create tables if they don't exist
        await sequelize.sync({ alter: false });
        console.log('Database initialized (existing data preserved)');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

export default sequelize;
