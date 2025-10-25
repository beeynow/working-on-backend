// ==================== services/mergeService.js ====================
const { PDFDocument: PDFMerge } = require("pdf-lib");

// Merge multiple PDFs
exports.mergePDFs = async (filePaths) => {
  const outputFilename = `${Date.now()}_merged.pdf`;
  const outputPath = path.join(path.dirname(filePaths[0]), outputFilename);

  const mergedPdf = await PDFMerge.create();

  for (const filePath of filePaths) {
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFMerge.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Convert images to PDF
exports.imagesToPDF = async (imagePaths) => {
  const outputFilename = `${Date.now()}_images.pdf`;
  const outputPath = path.join(path.dirname(imagePaths[0]), outputFilename);

  const doc = new PDFDocument({ autoFirstPage: false });
  const writeStream = require("fs").createWriteStream(outputPath);
  doc.pipe(writeStream);

  for (const imagePath of imagePaths) {
    const imageBuffer = await fs.readFile(imagePath);
    const img = doc.openImage(imageBuffer);
    doc.addPage({ size: [img.width, img.height] });
    doc.image(img, 0, 0);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};

// Merge images into collage
exports.mergeImages = async (imagePaths, layout = "grid") => {
  const outputFilename = `${Date.now()}_collage.jpg`;
  const outputPath = path.join(path.dirname(imagePaths[0]), outputFilename);

  const images = await Promise.all(
    imagePaths.map(async (path) => {
      const metadata = await sharp(path).metadata();
      return { path, width: metadata.width, height: metadata.height };
    })
  );

  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  const cellWidth = 500;
  const cellHeight = 500;
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  // Create composite image
  const composites = images.map((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      input: img.path,
      left: col * cellWidth,
      top: row * cellHeight,
    };
  });

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  const stats = await fs.stat(outputPath);

  return {
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
  };
};
