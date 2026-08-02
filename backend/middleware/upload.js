import fs from 'fs';
import path from 'path';
import multer from 'multer';
import CloudinaryService from '../services/cloudinaryService.js';

// Setup memoryStorage to buffer files in memory before uploading to Cloudinary
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

    if (file.buffer) {
      try {
        const folder = req.params?.folder || 'zipride_driver_docs';
        const uploadRes = await CloudinaryService.uploadImage(file.buffer, folder);
        if (uploadRes) {
          file.cloudinaryUrl = uploadRes.url;
          file.publicId = uploadRes.publicId;
          file.public_id = uploadRes.public_id;
          console.log(`[Upload Middleware] Successfully uploaded ${file.fieldname || 'file'} to Cloudinary: ${uploadRes.url}`);
        } else {
          console.warn(`[Upload Middleware] Cloudinary upload returned empty for ${file.originalname}. Fallback to base64 data URI.`);
          const base64Data = file.buffer.toString('base64');
          file.cloudinaryUrl = `data:${file.mimetype};base64,${base64Data}`;
          file.publicId = null;
          file.public_id = null;
        }
      } catch (err) {
        console.error('[Upload Middleware] Cloudinary upload error:', err.message);
        const base64Data = file.buffer.toString('base64');
        file.cloudinaryUrl = `data:${file.mimetype};base64,${base64Data}`;
        file.publicId = null;
        file.public_id = null;
      }
    }
  }

  next();
};

export const uploadToCloudinary = (folderName) => {
  return async (req, res, next) => {
    if (folderName) {
      req.params = req.params || {};
      req.params.folder = folderName;
    }
    await processUploadedFiles(req, res, next);
  };
};

export default upload;
