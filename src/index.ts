import 'dotenv/config';
import express, { Request, Response } from 'express';
import { db } from './db/client';
import { users } from './db/schema/users';
const app = express();
app.use(express.json());
const PORT = 3000;

import authRouter from './routes/auth';
app.use('/auth', authRouter);



app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/db-check', async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(users).limit(1);
    res.json({ ok: true, sample_count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

