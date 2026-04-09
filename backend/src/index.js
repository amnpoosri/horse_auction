require('dotenv').config();
const express = require('express');
const cors = require('cors');

const horsesRouter = require('./routes/horses');
const auctionsRouter = require('./routes/auctions');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Horse Auction API is running' });
});

app.use('/api/horses', horsesRouter);
app.use('/api/auctions', auctionsRouter);
app.use('/api/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
