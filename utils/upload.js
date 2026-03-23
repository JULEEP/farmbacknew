import multer from "multer";

const storage = multer.memoryStorage(); // BUFFER

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per image
  },
});

export default upload;