import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { GridFSService } from '../services/gridfsService.js';

// Setup local memoryStorage to buffer files before pushing to MongoDB GridFS
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per document
});

export const uploadSingle = (fieldName) => upload.single(fieldName);

export const validateDriverDocumentFiles = (req, res, next) => {
  if (req.files?.profilePhoto?.[0]) {
    const file = req.files.profilePhoto[0];
    const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedPhotoTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Profile Photo format. Allowed formats are JPG, JPEG, PNG, WEBP.'
      });
    }
  }

  if (req.files?.licenseImage?.[0]) {
    const file = req.files.licenseImage[0];
    const allowedLicenceTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedLicenceTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Driving Licence format. Allowed formats are JPG, JPEG, PNG, WEBP, PDF.'
      });
    }
  }

  next();
};

export const processUploadedFiles = async (req, res, next) => {
  const filesToProcess = [];

  if (req.file) {
    filesToProcess.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToProcess.push(...req.files);
    } else {
      Object.values(req.files).forEach((arr) => {
        if (Array.isArray(arr)) {
          filesToProcess.push(...arr);
        }
      });
    }
  }

  if (filesToProcess.length === 0) return next();

  for (const file of filesToProcess) {
    if (file.cloudinaryUrl) continue;

    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;

    if (file.buffer) {
      try {
        const gridFile = await GridFSService.uploadBuffer(safeName, file.buffer, file.mimetype, {
          originalname: file.originalname,
          fieldname: file.fieldname
        });
        file.cloudinaryUrl = gridFile.fileUrl;
        file.gridfsId = gridFile.fileId;
        console.log(`[Upload Middleware] Uploaded file to MongoDB GridFS: ${gridFile.fileUrl}`);
      } catch (err) {
        console.error('[Upload Middleware] GridFS upload failed:', err.message);
        const base64Data = file.buffer.toString('base64');
        file.cloudinaryUrl = `data:${file.mimetype};base64,${base64Data}`;
      }
    }
  }

  next();
};

export const uploadToCloudinary = (folderName) => {
  return async (req, res, next) => {
    await processUploadedFiles(req, res, next);
  };
};

export default upload;
