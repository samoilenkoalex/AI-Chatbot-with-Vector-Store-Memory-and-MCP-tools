const { PORT } = require('./src/config/config');
const app = require('./src/app');

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Try opening: http://localhost:${PORT}`);
});
