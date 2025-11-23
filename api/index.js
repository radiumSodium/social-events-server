// api/index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const createEventsRouter = require("../routes/eventsRoutes.js");

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let eventsCollection;
let joinedCollection;
let initialized = false;

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // add your deployed frontend URLs here, e.g.:
      // "https://your-frontend.netlify.app",
      // "https://your-frontend.web.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

async function init() {
  if (initialized) return;

  await client.connect();

  db = client.db("social_events");
  eventsCollection = db.collection("events");
  joinedCollection = db.collection("joinedEvents");

  // Root
  app.get("/", (req, res) => {
    res.send("Social Development Events API is running on Vercel.");
  });

  // Test DB
  app.get("/test-db", async (req, res) => {
    try {
      await db.command({ ping: 1 });
      const count = await eventsCollection.estimatedDocumentCount();

      res.json({
        ok: true,
        message: "MongoDB is working",
        totalEvents: count,
      });
    } catch (err) {
      console.error("test-db error:", err);
      res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  });

  // Dev-only seed
  app.get("/seed-demo-events", async (req, res) => {
    try {
      const now = new Date();
      const addDays = (d) => {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        return date;
      };

      const demoEvents = [
        {
          title: "City Park Cleanup Drive",
          description:
            "Join us to clean up the city park and make it a cleaner space for everyone.",
          eventType: "Cleanup",
          thumbnail: "https://placehold.co/600x400?text=Park+Cleanup",
          location: "City Park, Main Gate",
          eventDate: addDays(3),
          creatorEmail: "demo1@example.com",
          createdAt: now,
        },
        {
          title: "Tree Plantation Day",
          description:
            "Plant trees in the community area and help us make the city greener.",
          eventType: "Plantation",
          thumbnail: "https://placehold.co/600x400?text=Tree+Plantation",
          location: "Community Ground, Sector 5",
          eventDate: addDays(7),
          creatorEmail: "demo2@example.com",
          createdAt: now,
        },
        {
          title: "Food Donation for Street Children",
          description:
            "Distribute food packs and clothes to underprivileged children.",
          eventType: "Donation",
          thumbnail: "https://placehold.co/600x400?text=Food+Donation",
          location: "Central Bus Stand Area",
          eventDate: addDays(10),
          creatorEmail: "demo3@example.com",
          createdAt: now,
        },
        {
          title: "Road Safety Awareness Campaign",
          description:
            "Raise awareness about road safety rules among drivers and pedestrians.",
          eventType: "Awareness",
          thumbnail: "https://placehold.co/600x400?text=Road+Safety",
          location: "City Square, Near Traffic Signal",
          eventDate: addDays(5),
          creatorEmail: "demo4@example.com",
          createdAt: now,
        },
        {
          title: "Free Health Checkup Camp",
          description:
            "Free basic health checkup and consultation for low-income families.",
          eventType: "Health Camp",
          thumbnail: "https://placehold.co/600x400?text=Health+Camp",
          location: "Community Clinic, Block C",
          eventDate: addDays(14),
          creatorEmail: "demo5@example.com",
          createdAt: now,
        },
      ];

      const result = await eventsCollection.insertMany(demoEvents);

      res.json({
        ok: true,
        message: "Demo events inserted successfully.",
        insertedCount: result.insertedCount,
      });
    } catch (err) {
      console.error("Seed demo events error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to seed demo events",
        error: err.message,
      });
    }
  });

  // /events routes from your existing router
  app.use(
    "/events",
    createEventsRouter(eventsCollection, joinedCollection, db)
  );

  // Join event
  app.post("/join-event", async (req, res) => {
    try {
      const { eventId, userEmail } = req.body;

      if (!eventId || !userEmail) {
        return res.status(400).json({
          ok: false,
          message: "eventId and userEmail are required.",
        });
      }

      if (!ObjectId.isValid(eventId)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid eventId.",
        });
      }

      const event = await eventsCollection.findOne({
        _id: new ObjectId(eventId),
      });

      if (!event) {
        return res.status(404).json({
          ok: false,
          message: "Event not found.",
        });
      }

      const existing = await joinedCollection.findOne({
        eventId: event._id,
        userEmail,
      });

      if (existing) {
        return res.status(400).json({
          ok: false,
          message: "You have already joined this event.",
        });
      }

      const joinDoc = {
        eventId: event._id,
        userEmail,
        joinedAt: new Date(),
        eventTitle: event.title,
        eventType: event.eventType,
        thumbnail: event.thumbnail,
        location: event.location,
        eventDate: event.eventDate,
        creatorEmail: event.creatorEmail,
      };

      const result = await joinedCollection.insertOne(joinDoc);

      res.status(201).json({
        ok: true,
        message: "You have successfully joined this event.",
        joinId: result.insertedId,
      });
    } catch (err) {
      console.error("Join event error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to join event.",
        error: err.message,
      });
    }
  });

  // Joined events for user
  app.get("/joined", async (req, res) => {
    try {
      const userEmail = req.query.email;

      if (!userEmail) {
        return res.status(400).json({
          ok: false,
          message: "User email is required.",
        });
      }

      const joinedEvents = await joinedCollection
        .find({ userEmail })
        .sort({ eventDate: 1 })
        .toArray();

      res.json({
        ok: true,
        count: joinedEvents.length,
        joinedEvents,
      });
    } catch (err) {
      console.error("Get joined events error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to load joined events",
        error: err.message,
      });
    }
  });

  initialized = true;
}

module.exports = async (req, res) => {
  try {
    await init();
    return app(req, res);
  } catch (err) {
    console.error("Server init error:", err);
    res.status(500).json({
      ok: false,
      message: "Server initialization failed.",
      error: err.message,
    });
  }
};
