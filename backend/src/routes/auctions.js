const express = require('express');
const router = express.Router();

// GET all auctions
router.get('/', (req, res) => {
  res.json({ message: 'Get all auctions', data: [] });
});

// GET auction by id
router.get('/:id', (req, res) => {
  res.json({ message: `Get auction ${req.params.id}`, data: null });
});

// POST create auction
router.post('/', (req, res) => {
  res.status(201).json({ message: 'Auction created', data: req.body });
});

// PUT update auction
router.put('/:id', (req, res) => {
  res.json({ message: `Auction ${req.params.id} updated`, data: req.body });
});

// DELETE auction
router.delete('/:id', (req, res) => {
  res.json({ message: `Auction ${req.params.id} deleted` });
});

module.exports = router;
