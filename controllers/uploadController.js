// ==================== controllers/uploadController.js ====================
const path = require("path");
const fs = require("fs").promises;
const { pool } = require("../config/database");
const logger = require("../utils/logger");
const { uploadToCloud } = require("../utils/cloudStorage");
const { logActivity } = require("../utils/activityLogger");

// Upload single or multiple files
exports.uploadFiles = async (req, res) => {
  let uploadedFiles = [];
  try {
    const files = Array.isArray(req.files.file)
      ? req.files.file
      : [req.files.file];
    const userId = req.user.clerk_id;

    for (const file of files) {
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.sanitizedName}`;
      const uploadDir = path.join(__dirname, "../uploads");
      const filePath = path.join(uploadDir, filename);

      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Move file to uploads directory
      await file.mv(filePath);

      // Optional: Upload to cloud storage
      let cloudUrl = null;
      if (process.env.AWS_BUCKET_NAME || process.env.CLOUDINARY_CLOUD_NAME) {
        cloudUrl = await uploadToCloud(filePath, filename);
      }

      // Save file metadata to database
      const result = await pool.query(
        `INSERT INTO files (user_id, filename, original_name, file_type, file_size, file_path, operation_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          userId,
          filename,
          file.name,
          file.mimetype,
          file.size,
          cloudUrl || filePath,
          "upload",
        ]
      );

      uploadedFiles.push({
        id: result.rows[0].id,
        filename: result.rows[0].filename,
        originalName: result.rows[0].original_name,
        size: result.rows[0].file_size,
        type: result.rows[0].file_type,
      });
    }

    // Update user's daily upload count
    await pool.query(
      "UPDATE users SET daily_uploads = daily_uploads + $1 WHERE clerk_id = $2",
      [files.length, userId]
    );

    // Log activity
    await logActivity(userId, "FILE_UPLOAD", { count: files.length }, req.ip);

    res.status(201).json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    logger.error("File upload failed:", error);

    // Cleanup uploaded files on error
    for (const file of uploadedFiles) {
      try {
        const filePath = path.join(__dirname, "../uploads", file.filename);
        await fs.unlink(filePath);
      } catch (cleanupError) {
        logger.error("Cleanup failed:", cleanupError);
      }
    }

    res.status(500).json({ success: false, message: "File upload failed" });
  }
};

// Get user's upload history
exports.getUploadHistory = async (req, res) => {
  try {
    const userId = req.user.clerk_id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT id, filename, original_name, file_type, file_size, 
              conversion_status, operation_type, created_at, downloaded_at
       FROM files 
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM files WHERE user_id = $1 AND deleted_at IS NULL",
      [userId]
    );

    res.json({
      success: true,
      files: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error("Get upload history failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch upload history" });
  }
};

// Delete a file
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.clerk_id;

    // Get file details
    const fileResult = await pool.query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    const file = fileResult.rows[0];

    // Delete physical file
    try {
      if (!file.file_path.startsWith("http")) {
        await fs.unlink(file.file_path);
      }
      if (file.converted_path && !file.converted_path.startsWith("http")) {
        await fs.unlink(file.converted_path);
      }
    } catch (fsError) {
      logger.warn("Physical file deletion failed:", fsError);
    }

    // Mark as deleted in database
    await pool.query(
      "UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
      [fileId]
    );

    await logActivity(
      userId,
      "FILE_DELETE",
      { fileId, filename: file.filename },
      req.ip
    );

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    logger.error("Delete file failed:", error);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
};

// Download a file
exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.clerk_id;

    const fileResult = await pool.query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    const file = fileResult.rows[0];
    const filePath = file.converted_path || file.file_path;

    // Check if file exists
    if (filePath.startsWith("http")) {
      return res.redirect(filePath);
    }

    try {
      await fs.access(filePath);
    } catch {
      return res
        .status(404)
        .json({ success: false, message: "File not found on server" });
    }

    // Update download timestamp
    await pool.query(
      "UPDATE files SET downloaded_at = CURRENT_TIMESTAMP WHERE id = $1",
      [fileId]
    );

    await logActivity(
      userId,
      "FILE_DOWNLOAD",
      { fileId, filename: file.filename },
      req.ip
    );

    res.download(filePath, file.converted_filename || file.original_name);
  } catch (error) {
    logger.error("Download file failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to download file" });
  }
};
