import express from 'express';
import { GridFSService } from '../services/gridfsService.js';

const router = express.Router();

// GET /api/uploads/files/:id
router.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    let fileData = null;

    if (fileId && fileId.length === 24 && /^[0-9a-fA-F]{24}$/.test(fileId)) {
      fileData = await GridFSService.getFileStream(fileId);
    }
    if (!fileData) {
      fileData = await GridFSService.getFileStreamByFilename(fileId);
    }

    if (!fileData) {
      return res.status(404).json({ success: false, message: 'File not found in storage.' });
    }

    res.set('Content-Type', fileData.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    fileData.downloadStream.pipe(res);
  } catch (err) {
    console.error('[Upload Route] Stream file error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve file.' });
  }
});

export default router;
