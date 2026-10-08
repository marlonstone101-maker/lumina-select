const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images publicly
app.use('/uploads', express.static(uploadsDir));

// Configure Multer Storage for Uploaded Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure Nodemailer Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'limitless4659@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Submit Order & Email Receipt Endpoint
app.post('/api/orders', upload.single('receiptFile'), async (req, res) => {
    try {
        const { productName, customerName, customerPhone, shippingMethod } = req.body;
        const receiptFile = req.file;

        if (!customerName || !customerPhone || !receiptFile) {
            return res.status(400).json({ success: false, message: 'Missing required order fields or receipt image.' });
        }

        // Send Email Notification with Receipt Attachment
        const mailOptions = {
            from: process.env.EMAIL_USER || 'limitless4659@gmail.com',
            to: 'limitless4659@gmail.com',
            subject: `🚨 New Order Received: ${productName || 'Print Request'} - ${customerName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 2px solid #0022d4; rounded-corner: 10px;">
                    <h2 style="color: #0022d4; margin-bottom: 5px;">Limitless Designz & Printing Ltd</h2>
                    <h3 style="color: #e61c24;">New Customer Order Notification</h3>
                    <hr style="border: 1px solid #ffd600;">
                    <p><strong>Product Ordered:</strong> ${productName}</p>
                    <p><strong>Customer Name:</strong> ${customerName}</p>
                    <p><strong>Phone Number:</strong> ${customerPhone}</p>
                    <p><strong>Delivery Option:</strong> ${shippingMethod}</p>
                    <p><strong>Bank Transfer Receipt:</strong> Attached to this email.</p>
                </div>
            `,
            attachments: [
                {
                    filename: receiptFile.originalname,
                    path: receiptFile.path
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            success: true, 
            message: 'Order and bank receipt received and emailed successfully!',
            receiptUrl: `${req.protocol}://${req.get('host')}/uploads/${receiptFile.filename}`
        });

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ success: false, message: 'Server error processing order.' });
    }
});

// 2. Admin Endpoint to Upload Client/Admin Website Images
app.post('/api/admin/upload-image', upload.single('adminImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded.' });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully.',
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Admin upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to save admin upload.' });
    }
});

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.send('Limitless Designz & Printing Ltd Backend API Server is Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});