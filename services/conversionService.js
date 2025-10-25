// ==================== services/conversionService.js ====================
const path = require("path");
const fs = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const libre = require("libreoffice-convert");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");
const logger = require("../utils/logger");

// Convert file from one format to another
exports.convert = async (inputPath, fromFormat, toFormat, options = {}) => {
  try {
    logger.info(`Converting ${fromFormat} to ${toFormat}`);

    const outputFilename = `${Date.now()}_converted.${toFormat}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    // Route to appropriate conversion function
    if (fromFormat === "pdf" && ["docx", "doc"].includes(toFormat)) {
      await convertPDFToWord(inputPath, outputPath);
    } else if (["docx", "doc"].includes(fromFormat) && toFormat === "pdf") {
      await convertWordToPDF(inputPath, outputPath);
    } else if (["xlsx", "xls"].includes(fromFormat) && toFormat === "pdf") {
      await convertExcelToPDF(inputPath, outputPath);
    } else if (["pptx", "ppt"].includes(fromFormat) && toFormat === "pdf") {
      await convertPowerPointToPDF(inputPath, outputPath);
    } else if (
      ["jpg", "jpeg", "png", "webp", "gif"].includes(fromFormat) &&
      ["jpg", "jpeg", "png", "webp", "gif", "pdf"].includes(toFormat)
    ) {
      await convertImage(inputPath, outputPath, toFormat, options);
    } else if (
      fromFormat === "svg" &&
      ["png", "jpg", "pdf"].includes(toFormat)
    ) {
      await convertSVG(inputPath, outputPath, toFormat);
    } else {
      throw new Error(
        `Conversion from ${fromFormat} to ${toFormat} not supported`
      );
    }

    const stats = await fs.stat(outputPath);

    return {
      filename: outputFilename,
      path: outputPath,
      size: stats.size,
    };
  } catch (error) {
    logger.error("Conversion failed:", error);
    throw new Error(`Conversion failed: ${error.message}`);
  }
};

// PDF to Word conversion
async function convertPDFToWord(inputPath, outputPath) {
  try {
    // Using pdf2docx or similar tool
    await execPromise(`pdf2docx convert "${inputPath}" "${outputPath}"`);
  } catch (error) {
    // Fallback: basic text extraction
    logger.warn("Advanced PDF to Word conversion failed, using fallback");
    throw new Error("PDF to Word conversion requires pdf2docx tool installed");
  }
}

// Word to PDF conversion using LibreOffice
async function convertWordToPDF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const file = require("fs").readFileSync(inputPath);

    libre.convert(file, ".pdf", undefined, (err, done) => {
      if (err) {
        reject(new Error(`Word to PDF conversion failed: ${err.message}`));
        return;
      }

      require("fs").writeFileSync(outputPath, done);
      resolve();
    });
  });
}

// Excel to PDF conversion
async function convertExcelToPDF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const file = require("fs").readFileSync(inputPath);

    libre.convert(file, ".pdf", undefined, (err, done) => {
      if (err) {
        reject(new Error(`Excel to PDF conversion failed: ${err.message}`));
        return;
      }

      require("fs").writeFileSync(outputPath, done);
      resolve();
    });
  });
}

// PowerPoint to PDF conversion
async function convertPowerPointToPDF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const file = require("fs").readFileSync(inputPath);

    libre.convert(file, ".pdf", undefined, (err, done) => {
      if (err) {
        reject(
          new Error(`PowerPoint to PDF conversion failed: ${err.message}`)
        );
        return;
      }

      require("fs").writeFileSync(outputPath, done);
      resolve();
    });
  });
}

// Image format conversion using Sharp
async function convertImage(inputPath, outputPath, toFormat, options) {
  let sharpInstance = sharp(inputPath);

  // Apply options if provided
  if (options.width || options.height) {
    sharpInstance = sharpInstance.resize(options.width, options.height, {
      fit: options.fit || "contain",
      withoutEnlargement: true,
    });
  }

  if (toFormat === "pdf") {
    // Convert image to PDF
    const imageBuffer = await sharp(inputPath).toBuffer();
    const doc = new PDFDocument({ autoFirstPage: false });

    const writeStream = require("fs").createWriteStream(outputPath);
    doc.pipe(writeStream);

    const img = doc.openImage(imageBuffer);
    doc.addPage({ size: [img.width, img.height] });
    doc.image(img, 0, 0);
    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  } else {
    // Convert to other image formats
    await sharpInstance
      .toFormat(toFormat, {
        quality: options.quality || 90,
      })
      .toFile(outputPath);
  }
}

// SVG conversion
async function convertSVG(inputPath, outputPath, toFormat) {
  try {
    if (toFormat === "png" || toFormat === "jpg") {
      await sharp(inputPath)
        .resize(options.width || 1920, options.height || 1080, {
          fit: "inside",
        })
        .toFormat(toFormat)
        .toFile(outputPath);
    } else if (toFormat === "pdf") {
      // Convert SVG to PNG first, then to PDF
      const tempPng = outputPath.replace(".pdf", ".png");
      await sharp(inputPath).png().toFile(tempPng);
      await convertImage(tempPng, outputPath, "pdf", {});
      await fs.unlink(tempPng);
    }
  } catch (error) {
    throw new Error(`SVG conversion failed: ${error.message}`);
  }
}
