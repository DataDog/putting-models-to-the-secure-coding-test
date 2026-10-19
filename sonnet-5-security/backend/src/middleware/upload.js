import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { isAllowedExtension, MAX_UPLOAD_BYTES } from '../services/fileValidation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    // Cheap early rejection by extension; the authoritative check is the
    // magic-byte/content validation run against the buffer in the controller.
    if (!isAllowedExtension(file.originalname)) {
      return cb(new AppError(400, 'File type not allowed'));
    }
    cb(null, true);
  },
}).single('file');

export function documentUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.message));
    }
    next(err);
  });
}
