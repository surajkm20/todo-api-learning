import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;


app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});