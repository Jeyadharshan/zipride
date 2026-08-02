import { upload } from '../config/upload.js';

export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
export const uploadFields = (fieldsArray) => upload.fields(fieldsArray);
