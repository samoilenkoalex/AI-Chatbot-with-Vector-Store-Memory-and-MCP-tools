import { PORT } from './config/config.js';
import app from './app.js';
import { testConnection, initializeDatabase } from './config/database.js';
import User from './models/user_model.js';

// Function to display all users
const displayAllUsers = async () => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'createdAt'], // Excluding password for security
        });
        console.log('\n=== Current Users in Database ===');
        if (users.length === 0) {
            console.log('No users found in database');
        } else {
            users.forEach((user) => {
                console.log(`\nUser ID: ${user.id}`);
                console.log(`Username: ${user.username}`);
                console.log(`Created At: ${user.createdAt}`);
                console.log('------------------------');
            });
        }
        console.log('\n');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};

// Start the server
const startServer = async () => {
    try {
        // Initialize database and display users
        await testConnection();
        await initializeDatabase();
        await displayAllUsers();

        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Try opening: http://localhost:${PORT}`);
        });

        server.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
                console.error(
                    `Port ${PORT} is already in use. Please try a different port or kill the process using that port.`
                );
                process.exit(1);
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received. Closing server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.info('SIGINT signal received. Closing server...');
    process.exit(0);
});

startServer();
