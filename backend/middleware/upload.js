import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsBaseDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// Setup local memoryStorage to buffer files before pushing to Cloudinary
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
    const minSize = 1 * 1024 * 1024; // 1 MB
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size < minSize || file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `Profile Photo size must be between 1 MB and 2 MB. Provided size is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
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

    const isCloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name'
    );

    let success = false;
    if (isCloudinaryConfigured && file.buffer) {
      try {
        const fileBufferStr = file.buffer.toString('base64');
        const fileUri = `data:${file.mimetype};base64,${fileBufferStr}`;
        const uploadResult = await cloudinary.uploader.upload(fileUri, {
          folder: 'zipride/documents',
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
        });
        file.cloudinaryUrl = uploadResult.secure_url;
        success = true;
      } catch (err) {
        console.warn('[Upload Middleware] Cloudinary upload failed, falling back to local disk:', err.message);
      }
    }

    if (!success && file.buffer) {
      const localFilePath = path.join(uploadsBaseDir, safeName);
      fs.writeFileSync(localFilePath, file.buffer);
      file.cloudinaryUrl = `/uploads/${safeName}`;
      console.log(`[Upload Middleware] Saved uploaded file to disk: ${localFilePath} -> /uploads/${safeName}`);
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
