import express from 'express';
import router from './routes/router';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use('/api', router);

app.get('/', (req : express.Request, res : express.Response) => {
  res.send('Hello from Express!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
