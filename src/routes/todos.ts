import { Router, Request, Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { todos } from '../db/schema/todos';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);   // ← all routes below are protected

// POST /todos
router.post('/', async (req, res) => {
    try {               
  // body: { title, description? }
  const { title, description } = req.body;
  // validate title (required, length)
  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
    }
    if (title.length > 200) {
    return res.status(400).json({ error: 'Title is too long (max 200)' });
    }

  // insert with userId = req.userId
  const [todo] = await db.insert(todos).values({
    userId: req.userId!,
    title,
    description,
  }).returning();

  // 201 with the created todo
  res.status(201).json(todo);
    } catch (error) {   
    console.error('POST /todos failed:', error);
    res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /todos
router.get('/', async (req, res) => {
    try{
  // select where userId = req.userId AND deletedAt IS NULL
  const todoList = await db.select().from(todos).where(and(
    eq(todos.userId, req.userId!),
    isNull(todos.deletedAt)
  ));
  // 200 with array
  res.json(todoList);
    } catch (error) {
    console.error('GET /todos failed:', error);
    res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /todos/:id
router.get('/:id', async (req, res) => {
  // select where id = req.params.id AND userId = req.userId AND deletedAt IS NULL
  const [todo] = await db.select().from(todos).where(and(
    eq(todos.id, req.params.id),
    eq(todos.userId, req.userId!),
    isNull(todos.deletedAt)
  )).limit(1);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(todo);
});

// PATCH /todos/:id
router.patch('/:id', async (req, res) => {
    try {   
  const updates: Record<string, unknown> = {};
  
  if (req.body.title !== undefined) {
    if (typeof req.body.title !== 'string' || req.body.title.trim().length === 0) {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    if (req.body.title.length > 200) {
      return res.status(400).json({ error: 'Title is too long (max 200)' });
    }
    updates.title = req.body.title;
    
  }
  
  if (req.body.description !== undefined) {
    if (req.body.description !== null && typeof req.body.description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string or null' });
    }
    updates.description = req.body.description;
  }
  
  if (req.body.isCompleted !== undefined) {
    if (typeof req.body.isCompleted !== 'boolean') {
      return res.status(400).json({ error: 'isCompleted must be a boolean' });
    }
    updates.isCompleted = req.body.isCompleted;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(todos)
    .set(updates)
    .where(and(
      eq(todos.id, req.params.id),
      eq(todos.userId, req.userId!),
      isNull(todos.deletedAt)
    ))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(updated);
    } catch (error) {
    console.error('PATCH /todos/:id failed:', error);
    res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /todos/:id
router.delete('/:id', async (req, res) => {
    try{
  const [deleted] = await db
    .update(todos)
    .set({ deletedAt: new Date() })
    .where(and(
      eq(todos.id, req.params.id),
      eq(todos.userId, req.userId!),
      isNull(todos.deletedAt)
    ))
    .returning({ id: todos.id });

  if (!deleted) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.status(204).send();
    } catch (error) {
    console.error('DELETE /todos/:id failed:', error);
    res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;