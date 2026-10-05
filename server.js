require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARE SETUP
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Ensure absolute path for uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ==========================================
// 2. CONFIGURATIONS (NODEMAILER & MULTER)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'marlonstone101@gmail.com',
        pass: process.env.EMAIL_PASS || 'htngrhpztxuvayaf' // Recommended: use process.env.EMAIL_PASS
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `img-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP, GIF) are allowed.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.status(200).json({
        success: true,
        message: 'Image uploaded successfully!',
        url: imageUrl,
        filename: req.file.filename
    });
});

// Send Order / Contact Form Endpoint
app.post('/send-order', async (req, res) => {
    const { customerName, customerEmail, orderDetails } = req.body;

    if (!customerName || !customerEmail || !orderDetails) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER || 'marlonstone101@gmail.com',
        to: process.env.EMAIL_USER || 'limitless4659@gmail.com',
        subject: `New Order from ${customerName}`,
        text: `You have received a new order!\n\nName: ${customerName}\nEmail: ${customerEmail}\nDetails: ${orderDetails}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email notification.' });
    }
});

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});