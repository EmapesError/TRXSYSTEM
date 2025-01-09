const express = require("express");
const Redis = require("ioredis");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const redis = new Redis({
  host: "redis-15909.c330.asia-south1-1.gce.redns.redis-cloud.com",
  port: 15909,
  username: "default",
  password: "vlTo2zIEiLkhXA54Gn9Yk6vZosxDvwSZ",
  tls: {}
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test Redis Connection
redis.on("connect", () => console.log("Connected to Redis!"));
redis.on("error", (err) => console.error("Redis Error:", err));

// API Endpoints
app.post("/signup", async (req, res) => {
  const { username } = req.body;
  const userKey = `user:${username}`;

  const existingUser = await redis.hgetall(userKey);
  if (existingUser.username) {
    return res.json({ message: "User already exists", user: existingUser });
  }

  const newUser = {
    username,
    balance: 100,
    transactions: JSON.stringify([]),
  };
  await redis.hmset(userKey, newUser);
  res.json({ message: "User created successfully", user: newUser });
});

app.get("/user/:username", async (req, res) => {
  const { username } = req.params;
  const userKey = `user:${username}`;

  const user = await redis.hgetall(userKey);
  if (!user.username) {
    return res.status(404).json({ message: "User not found" });
  }

  user.transactions = JSON.parse(user.transactions);
  res.json(user);
});

app.post("/payment", async (req, res) => {
  const { fromUser, toUser, amount } = req.body;
  const fromKey = `user:${fromUser}`;
  const toKey = `user:${toUser}`;

  const fromUserData = await redis.hgetall(fromKey);
  const toUserData = await redis.hgetall(toKey);

  if (!fromUserData.username || !toUserData.username) {
    return res.status(404).json({ message: "User(s) not found" });
  }

  const fromBalance = parseInt(fromUserData.balance, 10);
  if (fromBalance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  await redis.hincrby(fromKey, "balance", -amount);
  await redis.hincrby(toKey, "balance", amount);
  res.json({ message: `Transferred ${amount} coins from ${fromUser} to ${toUser}` });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
