// ==================== services/editService.js ====================
const Tesseract = require("tesseract.js");
const { PDFDocument: PDFLib } = require("pdf-lib");

// Crop image
exports.cropImage = async (inputPath, { x, y, width, height }) => {
  const outputFilename = `${Date.now()}_cropped${path.extname(inputPath)}`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  await sharp(inputPath)
    .extract({ left: x, top: y, width, height })
    .toFile(outputPath);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Rotate image
exports.rotateImage = async (inputPath, degrees) => {
  const outputFilename = `${Date.now()}_rotated${path.extname(inputPath)}`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  await sharp(inputPath).rotate(degrees).toFile(outputPath);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Resize image
exports.resizeImage = async (
  inputPath,
  { width, height, maintainAspectRatio }
) => {
  const outputFilename = `${Date.now()}_resized${path.extname(inputPath)}`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  const resizeOptions = maintainAspectRatio
    ? { width, height, fit: "inside", withoutEnlargement: true }
    : { width, height, fit: "fill" };

  await sharp(inputPath).resize(resizeOptions).toFile(outputPath);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Compress file
exports.compressFile = async (inputPath, quality = 80) => {
  const outputFilename = `${Date.now()}_compressed${path.extname(inputPath)}`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  const ext = path.extname(inputPath).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    await sharp(inputPath).jpeg({ quality, mozjpeg: true }).toFile(outputPath);
  } else if (ext === ".pdf") {
    // PDF compression using Ghostscript
    await execPromise(
      `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`
    );
  } else {
    throw new Error("File type not supported for compression");
  }

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Remove background (simplified implementation)
exports.removeBackground = async (inputPath) => {
  const outputFilename = `${Date.now()}_no_bg.png`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  // Note: For production, integrate with remove.bg API or rembg Python library
  // This is a placeholder implementation
  await sharp(inputPath)
    .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(outputPath);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Remove watermark (simplified implementation)
exports.removeWatermark = async (inputPath, watermarkRegion) => {
  const outputFilename = `${Date.now()}_no_watermark${path.extname(inputPath)}`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  // Note: For production, use advanced image inpainting algorithms
  // This is a basic implementation using blur
  if (watermarkRegion) {
    const { x, y, width, height } = watermarkRegion;
    await sharp(inputPath)
      .blur(10)
      .extract({ left: x, top: y, width, height })
      .toFile(outputPath);
  } else {
    // Without region, just copy the file
    await fs.copyFile(inputPath, outputPath);
  }

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Annotate PDF
exports.annotatePDF = async (inputPath, annotations) => {
  const outputFilename = `${Date.now()}_annotated.pdf`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  const existingPdfBytes = await fs.readFile(inputPath);
  const pdfDoc = await PDFLib.load(existingPdfBytes);

  // Add annotations (simplified - in production, use full annotation library)
  const pages = pdfDoc.getPages();

  for (const annotation of annotations) {
    const page = pages[annotation.page || 0];
    // Add annotation logic here based on annotation type
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Add text to PDF
exports.addTextToPDF = async (
  inputPath,
  { text, page, x, y, fontSize, color }
) => {
  const outputFilename = `${Date.now()}_text_added.pdf`;
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  const existingPdfBytes = await fs.readFile(inputPath);
  const pdfDoc = await PDFLib.load(existingPdfBytes);

  const pages = pdfDoc.getPages();
  const targetPage = pages[page || 0];

  targetPage.drawText(text, {
    x: x || 50,
    y: y || 50,
    size: fontSize || 12,
    // color: rgb(0, 0, 0) - parse color parameter
  });

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Perform OCR on image
exports.performOCR = async (inputPath, language = "eng") => {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(inputPath, language, {
      logger: (info) => logger.info("OCR Progress:", info),
    });

    return text;
  } catch (error) {
    throw new Error(`OCR failed: ${error.message}`);
  }
};
