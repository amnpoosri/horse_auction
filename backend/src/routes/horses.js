const express = require('express');
const router = express.Router();

// GET all horses
router.get('/', (req, res) => {
  res.json({ message: 'Get all horses', data: [] });
});

// GET horse by id
router.get('/:id', (req, res) => {
  res.json({ message: `Get horse ${req.params.id}`, data: null });
});

// POST create horse
router.post('/', (req, res) => {
  res.status(201).json({ message: 'Horse created', data: req.body });
});

// PUT update horse
router.put('/:id', (req, res) => {
  res.json({ message: `Horse ${req.params.id} updated`, data: req.body });
});

// DELETE horse
router.delete('/:id', (req, res) => {
  res.json({ message: `Horse ${req.params.id} deleted` });
});

module.exports = router;
