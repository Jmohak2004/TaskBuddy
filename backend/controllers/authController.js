const User = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET || "secretKey", { expiresIn: '1d' });
};

const sendToken = (user, statusCode, res) => {
    try {
        const token = generateToken(user);
        const options = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            sameSite: 'lax'
        };
        res.cookie('token', token, options).status(statusCode).json({
            success: true,
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Token Generation Error:", err);
        res.status(500).json({ message: "Error generating auth token" });
    }
}

module.exports.registerUser = async (req, res) => {
    try {
        console.log("== REGISTER START ==");
        console.log("Body received:", req.body);

        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            console.log("Missing fields");
            return res.status(400).json({ message: "All fields are required" });
        }

        let userExists = await User.findOne({ email });
        if (userExists) {
            console.log("User already exists:", email);
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await User.create({
            fullname,
            email,
            password: hash
        });

        console.log("User created successfully:", user._id);
        sendToken(user, 201, res);
    } catch (err) {
        console.error("Critical Register Error:", err);
        res.status(500).json({ message: err.message || "Internal Server Error during registration" });
    }
};

module.exports.loginUser = async (req, res) => {
    try {
        console.log("== LOGIN START ==");
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log("Login failed: User not found");
            return res.status(400).json({ message: "Email or Password incorrect" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            console.log("Login success:", user.email);
            sendToken(user, 200, res);
        } else {
            console.log("Login failed: Password mismatch");
            res.status(400).json({ message: "Email or Password incorrect" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Internal Server Error during login" });
    }
};

module.exports.logoutUser = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.json({ success: true, message: "Logged out" });
};

module.exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
