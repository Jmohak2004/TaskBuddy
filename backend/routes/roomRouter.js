const express = require("express");
const router = express.Router();
const { createRoom, joinRoom, getUserRooms } = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get("/my-rooms", getUserRooms);

module.exports = router;
