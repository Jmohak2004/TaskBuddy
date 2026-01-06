const Room = require("../models/room-model");
const crypto = require("crypto");

// Create Room
module.exports.createRoom = async (req, res) => {
    try {
        const { name } = req.body;
        // Generate unique 6-char code
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();

        const room = await Room.create({
            name,
            code,
            owner: req.user._id,
            members: [req.user._id]
        });

        res.status(201).json({ success: true, room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Join Room
module.exports.joinRoom = async (req, res) => {
    try {
        const { code } = req.body;
        const room = await Room.findOne({ code });

        if (!room) return res.status(404).json({ message: "Invalid Room Code" });

        // Add user if not already member
        if (!room.members.includes(req.user._id)) {
            room.members.push(req.user._id);
            await room.save();
        }

        res.json({ success: true, room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get User Rooms
module.exports.getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.user._id });
        res.json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
