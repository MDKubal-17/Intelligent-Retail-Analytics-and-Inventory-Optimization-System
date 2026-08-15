import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

// --------------------------------------------------------------------------
// 1. REFRESH SESSION / KEEP ALIVE
// --------------------------------------------------------------------------
router.post('/refresh-session', async (req, res) => {
	try {
		return res.status(200).json({
			success: true,
			message: 'Session refreshed successfully.',
			timestamp: new Date(),
		});
	} catch (error) {
		console.error('Refresh session error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to refresh session.',
		});
	}
});

// --------------------------------------------------------------------------
// 2. REGISTER USER
// --------------------------------------------------------------------------
router.post('/register', async (req, res) => {
	try {
		const { name, email, password } = req.body;

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				message: 'User already exists',
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = new User({
			name,
			email,
			password: hashedPassword,
		});

		await user.save();

		res.status(201).json({
			message: 'User registered successfully',
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Server Error',
		});
	}
});

// --------------------------------------------------------------------------
// 3. LOGIN USER
// --------------------------------------------------------------------------
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({
				message: 'Invalid Email or Password',
			});
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({
				message: 'Invalid Email or Password',
			});
		}

		res.status(200).json({
			message: 'Login Successful',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ message: 'Server Error' });
	}
});

// --------------------------------------------------------------------------
// 4. UPDATE USER SETTINGS
// --------------------------------------------------------------------------
router.put('/update-settings', async (req, res) => {
	try {
		const { userId, email, currentPassword, newPassword } = req.body;

		// 1. Validate presence of userId
		if (!userId) {
			return res.status(400).json({
				message: 'User ID is required. Please log in again.',
			});
		}

		// 2. Validate MongoDB ObjectId format to prevent CastError crashes
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({
				message: 'Invalid User ID format. Please log in again.',
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'User account not found' });
		}

		// 3. Prevent duplicate emails across accounts
		if (email && email !== user.email) {
			const emailTaken = await User.findOne({ email });
			if (emailTaken) {
				return res.status(400).json({
					message: 'Email address is already in use by another account.',
				});
			}
			user.email = email;
		}

		// 4. Update password securely with verification
		if (newPassword) {
			if (!currentPassword) {
				return res.status(400).json({
					message: 'Current password is required to set a new password.',
				});
			}

			const isMatch = await bcrypt.compare(currentPassword, user.password);
			if (!isMatch) {
				return res.status(400).json({ message: 'Incorrect current password.' });
			}

			user.password = await bcrypt.hash(newPassword, 10);
		}

		await user.save();

		res.status(200).json({
			message: 'Settings updated successfully!',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		console.error('Update settings error:', error);
		res.status(500).json({ message: 'Server Error updating settings' });
	}
});

export default router;
