// ==================== controllers/editController.js ====================
const { pool } = require("../config/database");
const logger = require("../utils/logger");
const { logActivity } = require("../utils/activityLogger");
const editService = require("../services/editService");

// Crop image
exports.cropImage = async (req, res) => {
  try {
    const { fileId, x, y, width, height } = req.body;
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
    const croppedFile = await editService.cropImage(file.file_path, {
      x,
      y,
      width,
      height,
    });

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [croppedFile.filename, croppedFile.path, "crop", fileId]
    );

    await logActivity(userId, "IMAGE_CROP", { fileId }, req.ip);

    res.json({
      success: true,
      message: "Image cropped successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Image crop failed:", error);
    res.status(500).json({ success: false, message: "Image crop failed" });
  }
};

// Rotate image
exports.rotateImage = async (req, res) => {
  try {
    const { fileId, degrees } = req.body;
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
    const rotatedFile = await editService.rotateImage(file.file_path, degrees);

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [rotatedFile.filename, rotatedFile.path, "rotate", fileId]
    );

    await logActivity(userId, "IMAGE_ROTATE", { fileId, degrees }, req.ip);

    res.json({
      success: true,
      message: "Image rotated successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Image rotation failed:", error);
    res.status(500).json({ success: false, message: "Image rotation failed" });
  }
};

// Resize image
exports.resizeImage = async (req, res) => {
  try {
    const { fileId, width, height, maintainAspectRatio = true } = req.body;
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
    const resizedFile = await editService.resizeImage(file.file_path, {
      width,
      height,
      maintainAspectRatio,
    });

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [resizedFile.filename, resizedFile.path, "resize", fileId]
    );

    await logActivity(
      userId,
      "IMAGE_RESIZE",
      { fileId, width, height },
      req.ip
    );

    res.json({
      success: true,
      message: "Image resized successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Image resize failed:", error);
    res.status(500).json({ success: false, message: "Image resize failed" });
  }
};

// Compress file
exports.compressFile = async (req, res) => {
  try {
    const { fileId, quality = 80 } = req.body;
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
    const compressedFile = await editService.compressFile(
      file.file_path,
      quality
    );

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [compressedFile.filename, compressedFile.path, "compress", fileId]
    );

    await logActivity(userId, "FILE_COMPRESS", { fileId, quality }, req.ip);

    res.json({
      success: true,
      message: "File compressed successfully",
      originalSize: file.file_size,
      compressedSize: compressedFile.size,
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("File compression failed:", error);
    res
      .status(500)
      .json({ success: false, message: "File compression failed" });
  }
};

// Remove background (Premium)
exports.removeBackground = async (req, res) => {
  try {
    const { fileId } = req.body;
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
    const processedFile = await editService.removeBackground(file.file_path);

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [processedFile.filename, processedFile.path, "remove_bg", fileId]
    );

    await logActivity(userId, "REMOVE_BACKGROUND", { fileId }, req.ip);

    res.json({
      success: true,
      message: "Background removed successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Background removal failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Background removal failed" });
  }
};

// Remove watermark (Premium)
exports.removeWatermark = async (req, res) => {
  try {
    const { fileId, watermarkRegion } = req.body;
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
    const processedFile = await editService.removeWatermark(
      file.file_path,
      watermarkRegion
    );

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [processedFile.filename, processedFile.path, "remove_watermark", fileId]
    );

    await logActivity(userId, "REMOVE_WATERMARK", { fileId }, req.ip);

    res.json({
      success: true,
      message: "Watermark removed successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Watermark removal failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Watermark removal failed" });
  }
};

// Annotate PDF
exports.annotatePDF = async (req, res) => {
  try {
    const { fileId, annotations } = req.body;
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
    const annotatedFile = await editService.annotatePDF(
      file.file_path,
      annotations
    );

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [annotatedFile.filename, annotatedFile.path, "pdf_annotate", fileId]
    );

    await logActivity(userId, "PDF_ANNOTATE", { fileId }, req.ip);

    res.json({
      success: true,
      message: "PDF annotated successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("PDF annotation failed:", error);
    res.status(500).json({ success: false, message: "PDF annotation failed" });
  }
};

// Add text to PDF
exports.addTextToPDF = async (req, res) => {
  try {
    const {
      fileId,
      text,
      page,
      x,
      y,
      fontSize = 12,
      color = "#000000",
    } = req.body;
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
    const modifiedFile = await editService.addTextToPDF(file.file_path, {
      text,
      page,
      x,
      y,
      fontSize,
      color,
    });

    await pool.query(
      `UPDATE files SET converted_filename = $1, converted_path = $2, operation_type = $3 WHERE id = $4`,
      [modifiedFile.filename, modifiedFile.path, "pdf_add_text", fileId]
    );

    await logActivity(userId, "PDF_ADD_TEXT", { fileId }, req.ip);

    res.json({
      success: true,
      message: "Text added to PDF successfully",
      downloadUrl: `/api/upload/download/${fileId}`,
    });
  } catch (error) {
    logger.error("Add text to PDF failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add text to PDF" });
  }
};

// Perform OCR (Premium)
exports.performOCR = async (req, res) => {
  try {
    const { fileId, language = "eng" } = req.body;
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
    const extractedText = await editService.performOCR(
      file.file_path,
      language
    );

    await logActivity(userId, "OCR", { fileId, language }, req.ip);

    res.json({
      success: true,
      message: "OCR completed successfully",
      text: extractedText,
    });
  } catch (error) {
    logger.error("OCR failed:", error);
    res.status(500).json({ success: false, message: "OCR failed" });
  }
};
