// server.js  (UPDATED with keep-alive pinger for Render free tier)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');   // ← Added for self-pinging

const app = express();
const PORT = process.env.PORT || 3000;

// ================== CONFIG ==================
const PING_URL = 'https://cdn.davidcyril.name.ng/';  // ← Your Render URL
const PING_INTERVAL = 2 * 60 * 1000; // 2 minutes in ms

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
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
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
    }, 30 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully. It will be automatically deleted in 30 minutes.',
      url: fileUrl,
      filename: req.file.filename,
      expiresIn: '30 minutes'
    });
  });
});

// ====================== EXTRA ENDPOINTS ======================
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ files });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'running', temp_storage: 'active' });
});

// NEW: Simple root endpoint (nice for pings)
app.get('/', (req, res) => {
  res.json({ message: 'Temp Image/Video Hosting API is alive! 🚀' });
});

// ====================== KEEP-ALIVE PINGER (for Render free tier) ======================
function startKeepAlive() {
  console.log(`🔄 Keep-alive pinger started → pinging ${PING_URL} every 2 minutes`);

  setInterval(() => {
    https.get(PING_URL, (res) => {
      console.log(`✅ Keep-alive ping: ${res.statusCode} (${new Date().toLocaleTimeString()})`);
      // Drain response body to prevent memory leak
      res.resume();
    }).on('error', (err) => {
      console.error('❌ Keep-alive ping failed:', err.message);
    });
  }, PING_INTERVAL);
}

// ====================== START SERVER ======================
app.listen(PORT, () => {
  console.log(`🚀 Temp Image/Video Hosting API running on port ${PORT}`);
  console.log(`📤 POST /upload`);
  console.log(`🔗 Files at /uploads/`);
  console.log(`⏰ Files auto-delete after 30 minutes`);
  
  // Start the pinger
  startKeepAlive();
});
