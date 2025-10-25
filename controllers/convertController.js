// ==================== controllers/convertController.js ====================
const { pool } = require("../config/database");
const logger = require("../utils/logger");
const { logActivity } = require("../utils/activityLogger");
const conversionService = require("../services/conversionService");

// Convert single file
exports.convertFile = async (req, res) => {
  try {
    const { fileId, fromFormat, toFormat, options = {} } = req.body;
    const userId = req.user.clerk_id;

    // Validate file ownership
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

    // Update conversion status to 'processing'
    await pool.query("UPDATE files SET conversion_status = $1 WHERE id = $2", [
      "processing",
      fileId,
    ]);

    // Perform conversion
    const convertedFile = await conversionService.convert(
      file.file_path,
      fromFormat,
      toFormat,
      options
    );

    // Update file record with conversion results
    await pool.query(
      `UPDATE files 
       SET conversion_status = $1, 
           converted_filename = $2, 
           converted_path = $3,
           operation_type = $4
       WHERE id = $5`,
      [
        "completed",
        convertedFile.filename,
        convertedFile.path,
        `convert_${fromFormat}_to_${toFormat}`,
        fileId,
      ]
    );

    await logActivity(
      userId,
      "FILE_CONVERT",
      {
        fileId,
        fromFormat,
        toFormat,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Conversion completed successfully",
      file: {
        id: fileId,
        convertedFilename: convertedFile.filename,
        downloadUrl: `/api/upload/download/${fileId}`,
      },
    });
  } catch (error) {
    logger.error("File conversion failed:", error);

    // Update status to failed
    if (req.body.fileId) {
      await pool.query(
        "UPDATE files SET conversion_status = $1 WHERE id = $2",
        ["failed", req.body.fileId]
      );
    }

    res.status(500).json({
      success: false,
      message: error.message || "File conversion failed",
    });
  }
};

// Batch conversion (Premium only)
exports.batchConvert = async (req, res) => {
  try {
    const { fileIds, fromFormat, toFormat, options = {} } = req.body;
    const userId = req.user.clerk_id;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "fileIds must be a non-empty array",
      });
    }

    // Check premium access
    if (req.user.role !== "premium" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Batch conversion is a premium feature",
      });
    }

    const results = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        const fileResult = await pool.query(
          "SELECT * FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
          [fileId, userId]
        );

        if (fileResult.rows.length === 0) {
          errors.push({ fileId, error: "File not found" });
          continue;
        }

        const file = fileResult.rows[0];

        await pool.query(
          "UPDATE files SET conversion_status = $1 WHERE id = $2",
          ["processing", fileId]
        );

        const convertedFile = await conversionService.convert(
          file.file_path,
          fromFormat,
          toFormat,
          options
        );

        await pool.query(
          `UPDATE files 
           SET conversion_status = $1, 
               converted_filename = $2, 
               converted_path = $3,
               operation_type = $4
           WHERE id = $5`,
          [
            "completed",
            convertedFile.filename,
            convertedFile.path,
            `batch_convert_${fromFormat}_to_${toFormat}`,
            fileId,
          ]
        );

        results.push({
          fileId,
          success: true,
          downloadUrl: `/api/upload/download/${fileId}`,
        });
      } catch (error) {
        logger.error(`Batch conversion failed for file ${fileId}:`, error);
        errors.push({ fileId, error: error.message });

        await pool.query(
          "UPDATE files SET conversion_status = $1 WHERE id = $2",
          ["failed", fileId]
        );
      }
    }

    await logActivity(
      userId,
      "BATCH_CONVERT",
      {
        count: fileIds.length,
        successful: results.length,
        fromFormat,
        toFormat,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Batch conversion completed. ${results.length} successful, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error) {
    logger.error("Batch conversion failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Batch conversion failed" });
  }
};

// Get conversion status
exports.getConversionStatus = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.clerk_id;

    const result = await pool.query(
      "SELECT conversion_status, converted_filename FROM files WHERE id = $1 AND user_id = $2",
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    res.json({
      success: true,
      status: result.rows[0].conversion_status,
      convertedFilename: result.rows[0].converted_filename,
    });
  } catch (error) {
    logger.error("Get conversion status failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get conversion status" });
  }
};

// Get supported conversion formats
exports.getSupportedFormats = (req, res) => {
  const formats = {
    pdf: ["docx", "xlsx", "pptx", "jpg", "png"],
    docx: ["pdf", "txt", "html"],
    xlsx: ["pdf", "csv"],
    pptx: ["pdf", "jpg"],
    jpg: ["png", "webp", "pdf"],
    png: ["jpg", "webp", "pdf"],
    svg: ["png", "jpg", "pdf"],
  };

  res.json({ success: true, formats });
};
