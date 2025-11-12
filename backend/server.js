// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(express.json());
app.use(cors());

// Cosmos DB setup
const client = new CosmosClient({
  endpoint: process.env.COSMOS_URI,
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DB;
const containerId = process.env.COSMOS_CONTAINER;

// Store a new vote
app.post("/vote", async (req, res) => {
  try {
    const { voterId, candidateId } = req.body;
    if (!voterId || !candidateId)
      return res.status(400).json({ error: "Missing voterId or candidateId" });

    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId, partitionKey: "/candidateId" });

    const vote = {
      id: `${voterId}-${Date.now()}`,
      voterId,
      candidateId,
      timestamp: new Date().toISOString(),
    };

    await container.items.create(vote);
    res.status(201).json({ message: "Vote recorded successfully!" });
  } catch (err) {
    console.error("Error storing vote:", err.message);
    res.status(500).json({ error: "Failed to store vote" });
  }
});

// Get voting results
app.get("/results", async (req, res) => {
  try {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });

    const { resources: votes } = await container.items.readAll().fetchAll();

    // Count votes by candidate
    const results = votes.reduce((acc, vote) => {
      acc[vote.candidateId] = (acc[vote.candidateId] || 0) + 1;
      return acc;
    }, {});

    res.json(results);
  } catch (err) {
    console.error("Error fetching results:", err.message);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("✅ Voting System Backend is running!");
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
