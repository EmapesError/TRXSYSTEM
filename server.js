require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000; // Ensure it uses the correct port if deployed

// GitHub API and Repository Details
const GITHUB_API = "https://api.github.com";
const OWNER = "EmapesError"; // Your GitHub username
const REPO = "TRXSYSTEM"; // Repository name
const FILE_PATH = "data.json"; // File where data is stored
const TOKEN = process.env.GITHUB_PAT; // Load PAT securely from .env file

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Function to fetch data.json from GitHub
async function fetchData() {
  try {
    const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const content = Buffer.from(response.data.content, "base64").toString("utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    throw err;
  }
}

// Function to update data.json on GitHub
async function updateData(data, message) {
  try {
    const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const fileResponse = await axios.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const sha = fileResponse.data.sha;
    const updatedContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

    await axios.put(
      url,
      {
        message,
        content: updatedContent,
        sha,
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }
    );
  } catch (err) {
    console.error("Error updating data:", err.message);
    throw err;
  }
}

// API Endpoints

// Sign Up Endpoint
app.post("/signup", async (req, res) => {
  const { username } = req.body;
  try {
    const data = await fetchData();

    // Check if user already exists
    const userExists = data.users.some((user) => user.username === username);
    if (userExists) {
      return res.json({ message: "User already exists", user: null });
    }

    // Create new user
    const newUser = { username, balance: 100, transactions: [] };
    data.users.push(newUser);

    // Update GitHub data
    await updateData(data, `Added new user: ${username}`);
    res.json({ message: "User created successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get User Details Endpoint
app.get("/user/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const data = await fetchData();

    const user = data.users.find((user) => user.username === username);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Payment Endpoint
app.post("/payment", async (req, res) => {
  const { fromUser, toUser, amount } = req.body;
  try {
    const data = await fetchData();

    const sender = data.users.find((user) => user.username === fromUser);
    const receiver = data.users.find((user) => user.username === toUser);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Update balances
    sender.balance -= amount;
    receiver.balance += amount;

    // Add transactions
    sender.transactions.push({ to: toUser, amount });
    receiver.transactions.push({ from: fromUser, amount });

    // Update GitHub data
    await updateData(data, `Payment of ${amount} from ${fromUser} to ${toUser}`);
    res.json({ message: `Transferred ${amount} coins from ${fromUser} to ${toUser}` });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
