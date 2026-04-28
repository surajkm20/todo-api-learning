import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  // 1. Pull email, password, name from req.body
  const { email, password, name } = req.body;

  // 2. Validate (return 400 if bad)
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'invalid email' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  // 3. bcrypt.hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. db.insert(users).values(...).returning(...)
  try {
    const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();
    // 5. Return 201 with the user
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })
  } catch (error) {
  const pgError = (error as { cause?: { code?: string } }).cause;
  if (pgError?.code === '23505') {
    return res.status(409).json({ error: 'Email already registered' });
  }
  console.error('signup failed:', error);
  res.status(500).json({ error: 'Internal server error' });
}
});


router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, (email)));
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '15minutes' }
    );

    res.json({ token });
  } catch (error) {
    console.error('login failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;