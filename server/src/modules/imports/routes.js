import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  commitController,
  errorsController,
  getPreviewController,
  listImportsController,
  previewController,
  templateController,
} from './controller.js';

const router = Router();

/**
 * Configure Multer in-memory storage for file uploads.
 * File size limit is strictly capped at 5 MB and single file upload only.
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

/**
 * Middleware wrapper for handling file upload errors cleanly.
 * Converts Multer errors into standard MicroLedger HttpError responses.
 */
function handleFileUpload(req, res, next) {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(422, 'IMPORT_LIMIT_EXCEEDED', 'Files may not exceed 5 MB.'));
    }

    return next(new HttpError(422, 'IMPORT_FILE_TYPE', 'Choose one .xlsx or .csv file.'));
  });
}

/**
 * Enforce authentication and administrative privilege for all import routes.
 * Inventory imports can create or update products and modify opening stock,
 * and therefore must remain restricted exclusively to Admins.
 */
router.use(authenticate, requireRole('admin'));

/**
 * Route: GET /api/v1/imports/template
 * Downloads a sample spreadsheet or CSV template with headers and example data.
 */
router.get('/template', templateController);

/**
 * Route: GET /api/v1/imports
 * Lists recent import history logs.
 */
router.get('/', listImportsController);

/**
 * Route: POST /api/v1/imports/preview
 * Uploads a spreadsheet/CSV file, parses rows, and returns a classified preview summary.
 */
router.post('/preview', handleFileUpload, previewController);

/**
 * Route: GET /api/v1/imports/:id/errors.csv
 * Downloads a CSV error report for rows that failed validation in a preview session.
 */
router.get('/:id/errors.csv', errorsController);

/**
 * Route: GET /api/v1/imports/:id
 * Retrieves paginated preview rows and status statistics for an active import session.
 */
router.get('/:id', getPreviewController);

/**
 * Route: POST /api/v1/imports/:id/commit
 * Commits an import preview session into the database (mode: 'all' or 'valid_only').
 */
router.post('/:id/commit', commitController);

export default router;
