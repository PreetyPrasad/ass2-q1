const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('uploads'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    profilePic: String,
    uploadedFiles: [String]
});

const User = mongoose.model('User', userSchema);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB file size limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    }
});

// Routes

// GET: Display registration form
app.get('/', (req, res) => {
    res.render('index');
});

// POST: Register user and upload files
app.post('/register', upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'uploadedFiles', maxCount: 10 }]), async (req, res) => {
    try {
        const { name, email } = req.body;
        const profilePic = req.files['profilePic'][0].filename;
        const uploadedFiles = req.files['uploadedFiles'].map(file => file.filename);

        const newUser = new User({ name, email, profilePic, uploadedFiles });
        await newUser.save();

        res.redirect('/list');
    } catch (error) {
        res.status(500).send('Error occurred: ' + error.message);
    }
});

// GET: List all uploaded files
app.get('/list', async (req, res) => {
    try {
        const users = await User.find();
        res.render('list', { users });
    } catch (error) {
        res.status(500).send('Error occurred: ' + error.message);
    }
});

// GET: Download file
app.get('/download/:filename', (req, res) => {
    const file = path.join(__dirname, 'uploads', req.params.filename);
    res.download(file, (err) => {
        if (err) {
            res.status(500).send('Error downloading file: ' + err.message);
        }
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
