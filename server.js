import express from 'express';
import path from 'path';
import 'dotenv/config';

global.__dirname = path.resolve();

const port = process.env.PORT || 1338;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Start server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
