import { GridFSBucket, ObjectId } from 'mongodb';
import { getMongoDB, connectMongoDB } from '../config/mongodb.js';

export function getGridFSBucket() {
  const db = getMongoDB();
  if (!db) return null;
  return new GridFSBucket(db, { bucketName: 'uploads' });
}

export const GridFSService = {
  async uploadBuffer(filename, buffer, mimetype, metadata = {}) {
    let db = getMongoDB();
    if (!db) {
      db = await connectMongoDB();
    }
    if (!db) {
      throw new Error('MongoDB database connection is not available for GridFS upload.');
    }

    const gridBucket = new GridFSBucket(db, { bucketName: 'uploads' });

    return new Promise((resolve, reject) => {
      const uploadStream = gridBucket.openUploadStream(filename, {
        contentType: mimetype,
        metadata: {
          ...metadata,
          mimetype,
          uploadedAt: new Date()
        }
      });

      uploadStream.on('error', (err) => reject(err));
      uploadStream.on('finish', (file) => {
        const fileId = file._id.toString();
        const fileUrl = `/api/uploads/files/${fileId}`;
        resolve({
          fileId,
          filename: file.filename,
          fileUrl,
          mimetype,
          size: buffer.length
        });
      });

      uploadStream.end(buffer);
    });
  },

  async getFileStream(fileId) {
    let db = getMongoDB();
    if (!db) {
      db = await connectMongoDB();
    }
    if (!db) return null;

    try {
      const gridBucket = new GridFSBucket(db, { bucketName: 'uploads' });
      const _id = new ObjectId(fileId);
      const files = await gridBucket.find({ _id }).toArray();
      if (!files || files.length === 0) return null;

      const fileInfo = files[0];
      const downloadStream = gridBucket.openDownloadStream(_id);
      return {
        fileInfo,
        contentType: fileInfo.contentType || fileInfo.metadata?.mimetype || 'application/octet-stream',
        downloadStream
      };
    } catch (err) {
      return null;
    }
  },

  async deleteFile(fileId) {
    let db = getMongoDB();
    if (!db) return false;

    try {
      const gridBucket = new GridFSBucket(db, { bucketName: 'uploads' });
      const _id = new ObjectId(fileId);
      await gridBucket.delete(_id);
      return true;
    } catch (err) {
      return false;
    }
  },

  async getFileStreamByFilename(filename) {
    let db = getMongoDB();
    if (!db) {
      db = await connectMongoDB();
    }
    if (!db) return null;

    try {
      const gridBucket = new GridFSBucket(db, { bucketName: 'uploads' });
      const files = await gridBucket.find({ filename }).toArray();
      if (!files || files.length === 0) return null;

      const fileInfo = files[0];
      const downloadStream = gridBucket.openDownloadStream(fileInfo._id);
      return {
        fileInfo,
        contentType: fileInfo.contentType || fileInfo.metadata?.mimetype || 'image/jpeg',
        downloadStream
      };
    } catch (err) {
      return null;
    }
  }
};

export default GridFSService;
