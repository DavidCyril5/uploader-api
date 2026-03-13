// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration - only images & videos, max 100MB
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Unique filename: timestamp-random-original-ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// ====================== UPLOAD ENDPOINT ======================
app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max 100MB allowed.' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use form field name "file"' });
    }

    const filePath = path.join(uploadDir, req.file.filename);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Delete file exactly after 30 minutes
    setTimeout(() => {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to delete ${req.file.filename}:`, unlinkErr);
        } else {
          console.log(`✅ Auto-deleted: ${req.file.filename} (30 minutes expired)`);
        }
      });
    }, 30 * 60 * 1000); // 30 minutes in ms

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully. It will be automatically deleted in 30 minutes.',
      url: fileUrl,
      filename: req.file.filename,
      expiresIn: '30 minutes'
    });
  });
});

// ====================== EXTRA ENDPOINTS (optional but useful) ======================

// List all currently active files
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ files: files });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'running', temp_storage: 'active' });
});

app.listen(PORT, () => {
  console.log(`🚀 Temp Image/Video Hosting API running on http://localhost:${PORT}`);
  console.log(`📤 POST /upload with form field "file"`);
  console.log(`🔗 Files served at /uploads/`);
  console.log(`⏰ Every file auto-deletes after exactly 30 minutes`);
});
