import express from 'express';
import PG from '../models/pg.models.js';

const router = express.Router();

router.post('/add', async (req, res) => {
  try {
    const newPG = new PG(req.body);
    await newPG.save();
    res.status(201).json(newPG);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
