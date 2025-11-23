// routes/eventsRoutes.js
const express = require("express");
const { ObjectId } = require("mongodb");

function createEventsRouter(eventsCollection, joinedCollection, db) {
  const router = express.Router();

  // ============================================================
  // CREATE EVENT  ->  POST /events
  // ============================================================
  router.post("/", async (req, res) => {
    try {
      const {
        title,
        description,
        eventType,
        thumbnail,
        location,
        eventDate,
        creatorEmail,
      } = req.body;

      if (
        !title ||
        !description ||
        !eventType ||
        !thumbnail ||
        !location ||
        !eventDate ||
        !creatorEmail
      ) {
        return res.status(400).json({
          ok: false,
          message: "All fields are required.",
        });
      }

      const eventDateObj = new Date(eventDate);
      const now = new Date();

      if (isNaN(eventDateObj.getTime())) {
        return res.status(400).json({
          ok: false,
          message: "Invalid event date.",
        });
      }

      if (eventDateObj <= now) {
        return res.status(400).json({
          ok: false,
          message: "Event date must be a future date.",
        });
      }

      const doc = {
        title,
        description,
        eventType,
        thumbnail,
        location,
        eventDate: eventDateObj,
        creatorEmail,
        createdAt: new Date(),
      };

      const result = await eventsCollection.insertOne(doc);

      res.status(201).json({
        ok: true,
        message: "Event created successfully!",
        eventId: result.insertedId,
      });
    } catch (err) {
      console.error("Create event error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to create event",
        error: err.message,
      });
    }
  });

  // ============================================================
  // GET ALL EVENTS  ->  GET /events
  // ============================================================
  router.get("/", async (req, res) => {
    try {
      const events = await eventsCollection
        .find({})
        .sort({ eventDate: 1 })
        .toArray();

      res.json({
        ok: true,
        count: events.length,
        events,
      });
    } catch (err) {
      console.error("Get all events error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to load events",
        error: err.message,
      });
    }
  });

  // ============================================================
  // GET UPCOMING EVENTS  ->  GET /events/upcoming
  // ============================================================
  router.get("/upcoming", async (req, res) => {
    try {
      const now = new Date();

      const events = await eventsCollection
        .find({
          eventDate: { $gt: now },
        })
        .sort({ eventDate: 1 })
        .toArray();

      res.json({
        ok: true,
        count: events.length,
        events,
      });
    } catch (err) {
      console.error("Upcoming events error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to load upcoming events",
        error: err.message,
      });
    }
  });

  // ============================================================
  // GET EVENTS CREATED BY A USER  ->  GET /events/user?email=...
  //  ⚠️ IMPORTANT: this route comes BEFORE "/:id"
  // ============================================================
  router.get("/user", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({
          ok: false,
          message: "User email is required.",
        });
      }

      const events = await eventsCollection
        .find({ creatorEmail: email })
        .sort({ eventDate: 1 })
        .toArray();

      res.json({
        ok: true,
        count: events.length,
        events,
      });
    } catch (err) {
      console.error("Get user events error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to load user events",
        error: err.message,
      });
    }
  });

  // ============================================================
  // GET SINGLE EVENT DETAILS  ->  GET /events/:id
  //  This comes AFTER "/user", so /events/user is NOT matched here
  // ============================================================
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid event id.",
        });
      }

      const event = await eventsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!event) {
        return res.status(404).json({
          ok: false,
          message: "Event not found.",
        });
      }

      res.json({
        ok: true,
        event,
      });
    } catch (err) {
      console.error("Get event details error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to load event details.",
        error: err.message,
      });
    }
  });

  // ============================================================
  // UPDATE EVENT (ONLY CREATOR)  ->  PUT /events/:id
  // ============================================================
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        eventType,
        thumbnail,
        location,
        eventDate,
        requestorEmail,
      } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid event id.",
        });
      }

      if (!requestorEmail) {
        return res.status(400).json({
          ok: false,
          message: "requestorEmail is required.",
        });
      }

      const existing = await eventsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!existing) {
        return res.status(404).json({
          ok: false,
          message: "Event not found.",
        });
      }

      if (existing.creatorEmail !== requestorEmail) {
        return res.status(403).json({
          ok: false,
          message: "You are not allowed to update this event.",
        });
      }

      if (
        !title ||
        !description ||
        !eventType ||
        !thumbnail ||
        !location ||
        !eventDate
      ) {
        return res.status(400).json({
          ok: false,
          message: "All fields are required.",
        });
      }

      const eventDateObj = new Date(eventDate);
      const now = new Date();

      if (isNaN(eventDateObj.getTime())) {
        return res.status(400).json({
          ok: false,
          message: "Invalid event date.",
        });
      }

      if (eventDateObj <= now) {
        return res.status(400).json({
          ok: false,
          message: "Event date must be a future date.",
        });
      }

      const updateDoc = {
        $set: {
          title,
          description,
          eventType,
          thumbnail,
          location,
          eventDate: eventDateObj,
        },
      };

      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );

      res.json({
        ok: true,
        message: "Event updated successfully.",
        modifiedCount: result.modifiedCount,
      });
    } catch (err) {
      console.error("Update event error:", err);
      res.status(500).json({
        ok: false,
        message: "Failed to update event.",
        error: err.message,
      });
    }
  });

  return router;
}

module.exports = createEventsRouter;
