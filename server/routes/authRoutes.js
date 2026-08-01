import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
        });

        // Save user
        await user.save();

        res.status(201).json({
            message: "User registered successfully",
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server Error",
        });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({
            message: "Invalid Email or Password",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid Email or Password",
        });
    }

    res.status(200).json({
        message: "Login Successful",
    });
});

export default router;