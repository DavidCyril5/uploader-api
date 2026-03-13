# Upload an image/video
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/your/image.jpg"

# Or with video
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/your/video.mp4"


{
  "success": true,
  "message": "File uploaded successfully. It will be automatically deleted in 30 minutes.",
  "url": "http://localhost:3000/uploads/1741892345678-123456789.jpg",
  "filename": "1741892345678-123456789.jpg",
  "expiresIn": "30 minutes"
}

