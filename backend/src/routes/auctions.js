const express = require('express');
const router = express.Router();

// In-memory auctions with seed data
const now = new Date();
const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

let nextId = 13;
const pastDate = (daysAgo, hoursAgo = 0) =>
  new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

const auctions = [
  {
    id: '1',
    horseName: 'Thunder Bolt',
    breed: 'Thoroughbred',
    age: 5,
    color: 'Bay',
    description: 'A powerful and fast Thoroughbred with multiple race wins. Excellent bloodline from Champion sire line. Ideal for competitive racing or breeding.',
    image: '',
    startingPrice: 15000,
    currentBid: 15000,
    bids: [],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  {
    id: '2',
    horseName: 'Silver Star',
    breed: 'Arabian',
    age: 4,
    color: 'Grey',
    description: 'Graceful Arabian mare known for endurance and elegance. Multiple show ring awards. Perfect for dressage, shows, and long-distance rides.',
    image: '',
    startingPrice: 22000,
    currentBid: 24500,
    bids: [
      { amount: 23000, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 7200000).toISOString() },
      { amount: 24500, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 3600000).toISOString() },
    ],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  {
    id: '3',
    horseName: 'Midnight Runner',
    breed: 'Friesian',
    age: 6,
    color: 'Black',
    description: 'Stunning black Friesian stallion with flowing mane. Trained in classical dressage. Exceptionally calm temperament and powerful build.',
    image: '',
    startingPrice: 35000,
    currentBid: 35000,
    bids: [],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  {
    id: '4',
    horseName: 'Golden Spirit',
    breed: 'Palomino Quarter Horse',
    age: 7,
    color: 'Gold',
    description: 'Eye-catching golden Palomino with excellent Western training. Ranch-proven, gentle with kids, and an absolute show-stopper in the arena.',
    image: '',
    startingPrice: 12000,
    currentBid: 13200,
    bids: [
      { amount: 13200, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 1800000).toISOString() },
    ],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  {
    id: '5',
    horseName: 'Celtic Dream',
    breed: 'Irish Sport Horse',
    age: 8,
    color: 'Chestnut',
    description: 'Proven show jumper with competition record up to 1.30m. Brave, scopey, and careful. Ready for the next level with an ambitious rider.',
    image: '',
    startingPrice: 28000,
    currentBid: 28000,
    bids: [],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  {
    id: '6',
    horseName: 'Desert Wind',
    breed: 'Akhal-Teke',
    age: 3,
    color: 'Buckskin',
    description: 'Rare and exotic Akhal-Teke with a metallic sheen coat. Young, athletic, and incredibly bonded to handler. A once-in-a-lifetime horse.',
    image: '',
    startingPrice: 45000,
    currentBid: 48000,
    bids: [
      { amount: 46000, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 5400000).toISOString() },
      { amount: 47000, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 3600000).toISOString() },
      { amount: 48000, bidder: 'Anonymous', timestamp: new Date(now.getTime() - 1200000).toISOString() },
    ],
    endsAt: endsAt.toISOString(),
    status: 'active',
  },
  // ── Recently Sold ──────────────────────────────────────────────────────
  {
    id: '7',
    horseName: 'Royal Majesty',
    breed: 'Hanoverian',
    age: 9,
    color: 'Bay',
    description: 'Elite Grand Prix dressage horse with FEI competition passport. Trained to PSG level. Smooth gaits, easy temperament, and outstanding presence in the ring.',
    image: '',
    startingPrice: 65000,
    currentBid: 82000,
    bids: [
      { amount: 68000, bidder: 'Anonymous', timestamp: pastDate(3, 20) },
      { amount: 72000, bidder: 'Anonymous', timestamp: pastDate(3, 16) },
      { amount: 75000, bidder: 'Anonymous', timestamp: pastDate(3, 10) },
      { amount: 78000, bidder: 'Anonymous', timestamp: pastDate(3, 5) },
      { amount: 82000, bidder: 'Anonymous', timestamp: pastDate(3, 1) },
    ],
    endsAt: pastDate(3),
    status: 'sold',
    soldDate: pastDate(3),
  },
  {
    id: '8',
    horseName: 'Snowflake',
    breed: 'Lipizzaner',
    age: 6,
    color: 'White',
    description: 'Classical dressage Lipizzaner mare. Descendant from the Spanish Riding School bloodlines. Incredible collection and piaffe talent. A true white beauty.',
    image: '',
    startingPrice: 40000,
    currentBid: 56500,
    bids: [
      { amount: 42000, bidder: 'Anonymous', timestamp: pastDate(5, 22) },
      { amount: 47000, bidder: 'Anonymous', timestamp: pastDate(5, 18) },
      { amount: 51000, bidder: 'Anonymous', timestamp: pastDate(5, 8) },
      { amount: 56500, bidder: 'Anonymous', timestamp: pastDate(5, 2) },
    ],
    endsAt: pastDate(5),
    status: 'sold',
    soldDate: pastDate(5),
  },
  {
    id: '9',
    horseName: 'Iron Will',
    breed: 'Clydesdale',
    age: 10,
    color: 'Bay',
    description: 'Magnificent Clydesdale gelding with feathered feet and gentle giant personality. Parade and carriage trained. Excellent with beginners and children.',
    image: '',
    startingPrice: 18000,
    currentBid: 24000,
    bids: [
      { amount: 20000, bidder: 'Anonymous', timestamp: pastDate(7, 20) },
      { amount: 22000, bidder: 'Anonymous', timestamp: pastDate(7, 12) },
      { amount: 24000, bidder: 'Anonymous', timestamp: pastDate(7, 3) },
    ],
    endsAt: pastDate(7),
    status: 'sold',
    soldDate: pastDate(7),
  },
  {
    id: '10',
    horseName: 'Phantom',
    breed: 'Andalusian',
    age: 5,
    color: 'Grey',
    description: 'Breathtaking grey Andalusian stallion. Flowing mane, collected movement, and fiery spirit. Championship lineage with ANCCE papers.',
    image: '',
    startingPrice: 55000,
    currentBid: 71000,
    bids: [
      { amount: 58000, bidder: 'Anonymous', timestamp: pastDate(10, 22) },
      { amount: 62000, bidder: 'Anonymous', timestamp: pastDate(10, 15) },
      { amount: 65000, bidder: 'Anonymous', timestamp: pastDate(10, 9) },
      { amount: 68000, bidder: 'Anonymous', timestamp: pastDate(10, 4) },
      { amount: 71000, bidder: 'Anonymous', timestamp: pastDate(10, 1) },
    ],
    endsAt: pastDate(10),
    status: 'sold',
    soldDate: pastDate(10),
  },
  {
    id: '11',
    horseName: 'Copper Ridge',
    breed: 'Quarter Horse',
    age: 12,
    color: 'Chestnut',
    description: 'Seasoned ranch horse with cow sense you can\'t teach. Ropes, cuts, and trails all day. Bombproof in every situation. True cowboy partner.',
    image: '',
    startingPrice: 9000,
    currentBid: 14500,
    bids: [
      { amount: 10500, bidder: 'Anonymous', timestamp: pastDate(14, 20) },
      { amount: 12000, bidder: 'Anonymous', timestamp: pastDate(14, 14) },
      { amount: 14500, bidder: 'Anonymous', timestamp: pastDate(14, 2) },
    ],
    endsAt: pastDate(14),
    status: 'sold',
    soldDate: pastDate(14),
  },
  {
    id: '12',
    horseName: 'Stardust',
    breed: 'Gypsy Vanner',
    age: 4,
    color: 'Pinto',
    description: 'Stunning black and white tobiano Gypsy Vanner. Thick feathering, flowing mane to the ground. Sweet, calm temperament. Perfect for driving or trail riding.',
    image: '',
    startingPrice: 32000,
    currentBid: 43000,
    bids: [
      { amount: 34000, bidder: 'Anonymous', timestamp: pastDate(2, 21) },
      { amount: 37000, bidder: 'Anonymous', timestamp: pastDate(2, 16) },
      { amount: 40000, bidder: 'Anonymous', timestamp: pastDate(2, 8) },
      { amount: 43000, bidder: 'Anonymous', timestamp: pastDate(2, 1) },
    ],
    endsAt: pastDate(2),
    status: 'sold',
    soldDate: pastDate(2),
  },
];

// GET all auctions
router.get('/', (req, res) => {
  res.json({ data: auctions });
});

// GET auction by id
router.get('/:id', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  res.json({ data: auction });
});

// POST place a bid on an auction (anonymous)
router.post('/:id/bids', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  if (new Date() > new Date(auction.endsAt)) {
    return res.status(400).json({ error: 'Auction has ended' });
  }

  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= auction.currentBid) {
    return res.status(400).json({
      error: `Bid must be higher than the current bid of $${auction.currentBid.toLocaleString()}`,
    });
  }

  const bid = {
    amount,
    bidder: 'Anonymous',
    timestamp: new Date().toISOString(),
  };

  auction.bids.push(bid);
  auction.currentBid = amount;

  res.status(201).json({ data: auction });
});

// POST create auction
router.post('/', (req, res) => {
  const { horseName, breed, age, color, description, image, startingPrice } = req.body;
  if (!horseName || !startingPrice) {
    return res.status(400).json({ error: 'horseName and startingPrice are required' });
  }
  const auction = {
    id: String(nextId++),
    horseName,
    breed: breed || 'Unknown',
    age: age || 0,
    color: color || 'Unknown',
    description: description || '',
    image: image || '',
    startingPrice,
    currentBid: startingPrice,
    bids: [],
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  };
  auctions.push(auction);
  res.status(201).json({ data: auction });
});

// PUT update auction
router.put('/:id', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  Object.assign(auction, req.body);
  res.json({ data: auction });
});

// DELETE auction
router.delete('/:id', (req, res) => {
  const idx = auctions.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Auction not found' });
  auctions.splice(idx, 1);
  res.json({ message: `Auction ${req.params.id} deleted` });
});

module.exports = router;
