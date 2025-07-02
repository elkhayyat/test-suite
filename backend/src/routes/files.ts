import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for testing purposes
    cb(null, true);
  }
});

export function fileRoutes() {
  // Upload single file
  router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileInfo = {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };

      res.json({
        success: true,
        file: fileInfo
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Upload multiple files
  router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const filesInfo = req.files.map(file => ({
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      }));

      res.json({
        success: true,
        files: filesInfo
      });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // List uploaded files
  router.get('/list', async (req: Request, res: Response) => {
    try {
      const files = fs.readdirSync(uploadsDir).map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          size: stats.size,
          uploadedAt: stats.ctime
        };
      });

      res.json({ files });
    } catch (error) {
      console.error('File list error:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // Delete file
  router.delete('/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('File delete error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Download file
  router.get('/download/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(filePath);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  return router;
}