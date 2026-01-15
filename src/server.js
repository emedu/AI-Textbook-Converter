// ============================================
// AI 教材轉換系統 - 主伺服器
// ============================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 設定檔案上傳
// ============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 使用時間戳記避免檔名衝突
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // 只接受 Markdown 檔案
        if (file.originalname.endsWith('.md')) {
            cb(null, true);
        } else {
            cb(new Error('只接受 .md 檔案!'));
        }
    }
});

// ============================================
// 建立必要資料夾
// ============================================
const dirs = ['./uploads', './output', './output/pdf', './output/docx'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================
// 靜態檔案服務(網頁介面)
// ============================================
app.use(express.static('public'));
app.use(express.json());

// ============================================
// 首頁路由
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// 檔案上傳與轉換 API
// ============================================
app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '請選擇檔案' });
        }

        console.log('📄 收到檔案:', req.file.originalname);

        // 讀取 Markdown 內容
        const filePath = req.file.path;
        const markdownContent = fs.readFileSync(filePath, 'utf-8');

        // 第一階段:先產生基本 HTML
        const converter = require('./converter');
        const htmlContent = converter.markdownToHTML(markdownContent);

        // 產生 PDF
        console.log('📑 正在產生 PDF...');
        const pdfPath = await converter.generatePDF(htmlContent, req.file.originalname);

        // 產生 Word(使用 Pandoc)
        console.log('📝 正在產生 Word...');
        const docxPath = await converter.generateWord(filePath, req.file.originalname);

        // 回傳下載連結
        res.json({
            success: true,
            message: '轉換成功!',
            files: {
                pdf: `/download/pdf/${path.basename(pdfPath)}`,
                docx: `/download/docx/${path.basename(docxPath)}`
            }
        });

        console.log('✅ 轉換完成!');

    } catch (error) {
        console.error('❌ 轉換失敗:', error);
        res.status(500).json({ 
            error: '轉換失敗: ' + error.message 
        });
    }
});

// ============================================
// 檔案下載路由
// ============================================
app.get('/download/pdf/:filename', (req, res) => {
    const file = path.join(__dirname, '../output/pdf', req.params.filename);
    res.download(file);
});

app.get('/download/docx/:filename', (req, res) => {
    const file = path.join(__dirname, '../output/docx', req.params.filename);
    res.download(file);
});

// ============================================
// 啟動伺服器
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  🚀 AI 教材轉換系統已啟動!');
    console.log('========================================');
    console.log('');
    console.log(`  📍 網址: http://localhost:${PORT}`);
    console.log('');
    console.log('  💡 使用方式:');
    console.log('     1. 在瀏覽器開啟上面的網址');
    console.log('     2. 上傳 Markdown 檔案');
    console.log('     3. 下載產生的 PDF 和 Word');
    console.log('');
    console.log('  ⏹  按 Ctrl+C 可關閉程式');
    console.log('========================================');
    console.log('');
});
