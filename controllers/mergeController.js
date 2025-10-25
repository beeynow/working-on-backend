
// ==================== controllers/mergeController.js ====================
const mergeService = require('../services/mergeService');

// Merge PDFs
exports.mergePDFs = async (req, res) => {
  try {
    const { fileIds } = req.body;
    const userId = req.user.clerk_id;

    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 2 images required for collage' 
      });
    }

    const filesResult = await pool.query(
      'SELECT * FROM files WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL',
      [fileIds, userId]
    );

    if (filesResult.rows.length !== fileIds.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Some files not found or inaccessible' 
      });
    }

    const imagePaths = filesResult.rows.map(f => f.file_path);
    const collageFile = await mergeService.mergeImages(imagePaths, layout);

    const result = await pool.query(
      `INSERT INTO files (user_id, filename, original_name, file_type, file_size, file_path, operation_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, collageFile.filename, 'collage.jpg', 'image/jpeg', collageFile.size, collageFile.path, 'merge_images']
    );

    await logActivity(userId, 'MERGE_IMAGES', { imageCount: fileIds.length, layout }, req.ip);

    res.json({
      success: true,
      message: 'Images merged successfully',
      fileId: result.rows[0].id,
      downloadUrl: `/api/upload/download/${result.rows[0].id}`
    });
  } catch (error) {
    logger.error('Image merge failed:', error);
    res.status(500).json({ success: false, message: 'Image merge failed' });
  }
};({ 
        success: false, 
        message: 'At least 2 files required for merging' 
      });
    }

    // Get all files
    const filesResult = await pool.query(
      'SELECT * FROM files WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL',
      [fileIds, userId]
    );

    if (filesResult.rows.length !== fileIds.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Some files not found or inaccessible' 
      });
    }

    const filePaths = filesResult.rows.map(f => f.file_path);
    const mergedFile = await mergeService.mergePDFs(filePaths);

    // Create new file record for merged PDF
    const result = await pool.query(
      `INSERT INTO files (user_id, filename, original_name, file_type, file_size, file_path, operation_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, mergedFile.filename, 'merged.pdf', 'application/pdf', mergedFile.size, mergedFile.path, 'merge_pdf']
    );

    await logActivity(userId, 'MERGE_PDF', { fileCount: fileIds.length }, req.ip);

    res.json({
      success: true,
      message: 'PDFs merged successfully',
      fileId: result.rows[0].id,
      downloadUrl: `/api/upload/download/${result.rows[0].id}`
    });
  } catch (error) {
    logger.error('PDF merge failed:', error);
    res.status(500).json({ success: false, message: 'PDF merge failed' });
  }
};

// Merge images to PDF
exports.mergeImagesToPDF = async (req, res) => {
  try {
    const { fileIds } = req.body;
    const userId = req.user.clerk_id;

    if (!Array.isArray(fileIds) || fileIds.length < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 1 image required' 
      });
    }

    const filesResult = await pool.query(
      'SELECT * FROM files WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL',
      [fileIds, userId]
    );

    if (filesResult.rows.length !== fileIds.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Some files not found or inaccessible' 
      });
    }

    const imagePaths = filesResult.rows.map(f => f.file_path);
    const pdfFile = await mergeService.imagesToPDF(imagePaths);

    const result = await pool.query(
      `INSERT INTO files (user_id, filename, original_name, file_type, file_size, file_path, operation_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, pdfFile.filename, 'images-merged.pdf', 'application/pdf', pdfFile.size, pdfFile.path, 'images_to_pdf']
    );

    await logActivity(userId, 'IMAGES_TO_PDF', { imageCount: fileIds.length }, req.ip);

    res.json({
      success: true,
      message: 'Images converted to PDF successfully',
      fileId: result.rows[0].id,
      downloadUrl: `/api/upload/download/${result.rows[0].id}`
    });
  } catch (error) {
    logger.error('Images to PDF failed:', error);
    res.status(500).json({ success: false, message: 'Images to PDF conversion failed' });
  }
};

// Merge images into collage
exports.mergeImages = async (req, res) => {
  try {
    const { fileIds, layout = 'grid' } = req.body;
    const userId = req.user.clerk_id;

    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json