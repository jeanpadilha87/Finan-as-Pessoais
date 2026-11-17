const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const receiptDir = path.resolve(__dirname, "../../private-receipts");
fs.mkdirSync(receiptDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({ destination: receiptDir, filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`) }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12, fieldSize: 16 * 1024, headerPairs: 100 },
    fileFilter: (_req, file, cb) => {
        const allowed = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
        if (!allowed[file.mimetype]) return cb(new Error("Recibo deve ser PDF, JPG, PNG ou WEBP."));
        file.receiptExtension = allowed[file.mimetype];
        cb(null, true);
    }
});

function validateReceipt(file) {
    const buffer = fs.readFileSync(file.path);
    const valid = file.mimetype === "application/pdf" ? buffer.subarray(0, 5).toString() === "%PDF-"
        : file.mimetype === "image/jpeg" ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        : file.mimetype === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : file.mimetype === "image/webp" ? buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" : false;
    if (!valid) { fs.unlinkSync(file.path); return false; }
    const finalPath = `${file.path.slice(0, -7)}${file.receiptExtension}`;
    fs.renameSync(file.path, finalPath);
    file.path = finalPath;
    file.filename = path.basename(finalPath);
    return true;
}

module.exports = { upload, validateReceipt, receiptDir };
