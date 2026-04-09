const express = require('express');
const router = express.Router();

// GET all users
router.get('/', (req, res) => {
  res.json({ message: 'Get all users', data: [] });
});

// GET user by id
router.get('/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id}`, data: null });
});

// POST create user
router.post('/', (req, res) => {
  res.status(201).json({ message: 'User created', data: req.body });
});

// PUT update user
router.put('/:id', (req, res) => {
  res.json({ message: `User ${req.params.id} updated`, data: req.body });
});

// DELETE user
router.delete('/:id', (req, res) => {
  res.json({ message: `User ${req.params.id} deleted` });
});

module.exports = router;
