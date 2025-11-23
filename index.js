const express = require("express");
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("social_events");
    const eventsCollection = db.collection("events");
    const joinedCollection = db.collection("joinedEvents");

    app.get("/", (req, res) => {
      req.send("Social Development Events API is running ....");
    });

    // ---- Events CRUD & query routes will go here ----
    // POST /events (create)
    // GET /events (upcoming + filter + search)
    // GET /events/:id (details)
    // GET /events/user/:email (manage events)
    // PUT /events/:id (update)
    // DELETE /events/:id (optional)

    // ---- Joined events ----
    // POST /join (user joins event)
    // GET /joined?email= (joined events list sorted by date)

    app.listen(port, () => {
      console.log(`Server is running on port : ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
