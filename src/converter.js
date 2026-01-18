// ============================================
// 轉換引擎 - 負責 Markdown → PDF/Word
// ============================================

const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});

// ============================================
// Markdown 轉 HTML
// ============================================
function markdownToHTML(markdownContent) {
    // 將 Markdown 轉換為 HTML
    const htmlBody = md.render(markdownContent);

    // 包裝成完整的 HTML 文件(含樣式)
    const fullHTML = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>教材文件</title>
    <style>
        /* ===== 頁面設定 ===== */
        @page {
            size: A4;
            margin: 20mm;
        }
        
        /* ===== 基礎樣式 ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
            line-height: 1.9;
            color: #333;
            background: white;
            font-size: 14px;
        }
        
        /* ===== 標題樣式 - 強化視覺層次 ===== */
        h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            border-bottom: 4px solid #3498db;
            padding-bottom: 12px;
            margin-top: 0;
            margin-bottom: 24px;
            page-break-before: always;  /* 每個 H1 前強制換頁 */
            page-break-after: avoid;
        }
        
        /* 第一個 H1 不換頁 */
        h1:first-of-type {
            page-break-before: avoid;
        }
        
        h2 {
            font-size: 22px;
            font-weight: bold;
            color: #2c3e50;
            border-left: 6px solid #3498db;
            padding-left: 16px;
            margin-top: 32px;
            margin-bottom: 16px;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 18px;
            font-weight: bold;
            color: #34495e;
            margin-top: 24px;
            margin-bottom: 12px;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 16px;
            font-weight: bold;
            color: #555;
            margin-top: 20px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }
        
        h5, h6 {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            margin-top: 16px;
            margin-bottom: 8px;
        }
        
        /* ===== 段落與文字 - 增加呼吸空間 ===== */
        p {
            margin: 14px 0;
            text-align: justify;
            line-height: 2.0;
        }
        
        /* ===== 列表樣式 - 改善可讀性 ===== */
        ul, ol {
            margin: 16px 0;
            padding-left: 32px;
        }
        
        li {
            margin: 10px 0;
            line-height: 1.8;
        }
        
        /* 巢狀列表 */
        li > ul, li > ol {
            margin: 8px 0;
        }
        
        /* ===== 程式碼區塊 ===== */
        code {
            background: #f5f5f5;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: "Consolas", "Courier New", monospace;
            font-size: 13px;
            color: #c7254e;
        }
        
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 24px 0;
            page-break-inside: avoid;
            line-height: 1.6;
        }
        
        pre code {
            background: transparent;
            color: #ecf0f1;
            padding: 0;
        }
        
        /* ===== 表格樣式 - 專業排版 ===== */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            page-break-inside: avoid;
            font-size: 13px;
        }
        
        th {
            background: #3498db;
            color: white;
            padding: 14px 12px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #2980b9;
        }
        
        td {
            border: 1px solid #ddd;
            padding: 12px;
            vertical-align: top;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        tr:hover {
            background: #f0f0f0;
        }
        
        /* ===== 引用區塊 ===== */
        blockquote {
            border-left: 5px solid #3498db;
            background: #f8f9fa;
            padding: 16px 24px;
            margin: 24px 0;
            font-style: italic;
            color: #555;
            page-break-inside: avoid;
        }
        
        /* ===== 連結樣式 ===== */
        a {
            color: #3498db;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        /* ===== 圖片樣式 ===== */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 24px auto;
            border-radius: 6px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
            page-break-inside: avoid;
        }
        
        /* ===== 分隔線 ===== */
        hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 32px 0;
        }
        
        /* ===== 強調文字 ===== */
        strong, b {
            font-weight: bold;
            color: #2c3e50;
        }
        
        em, i {
            font-style: italic;
            color: #555;
        }
        
        /* ===== 列印專用樣式 ===== */
        @media print {
            body {
                font-size: 12pt;
            }
            
            h1 {
                page-break-before: always;
            }
            
            h1:first-of-type {
                page-break-before: avoid;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            p, li {
                orphans: 3;
                widows: 3;
            }
            
            pre, table, img, blockquote {
                page-break-inside: avoid;
            }
            
            a {
                color: #3498db;
                text-decoration: underline;
            }
        }
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>
    `;

    return fullHTML;
}

// ============================================
// 產生 PDF (使用 Puppeteer)
// ============================================
async function generatePDF(htmlContent, originalFilename) {
    console.log('  → 啟動 PDF 渲染引擎...');

    // 啟動無頭瀏覽器
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 載入 HTML 內容
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
    });

    // 產生輸出檔名
    const outputFilename = originalFilename.replace('.md', '.pdf');
    const outputPath = path.join(__dirname, '../output/pdf', outputFilename);

    // 產生 PDF
    await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
            <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
        `
    });

    await browser.close();

    console.log('  ✓ PDF 產生完成:', outputFilename);
    return outputPath;
}

// ============================================
// 產生 Word (使用 Pandoc)
// ============================================
async function generateWord(markdownFilePath, originalFilename) {
    console.log('  → 啟動 Word 轉換引擎...');

    const outputFilename = originalFilename.replace('.md', '.docx');
    const outputPath = path.join(__dirname, '../output/docx', outputFilename);

    // 檢查 Pandoc 是否安裝
    try {
        await execPromise('pandoc --version');
    } catch (error) {
        throw new Error('找不到 Pandoc! 請先安裝 Pandoc: https://pandoc.org/installing.html');
    }

    // 使用 Pandoc 轉換
    const command = `pandoc "${markdownFilePath}" -o "${outputPath}" --toc --toc-depth=3`;

    try {
        await execPromise(command);
        console.log('  ✓ Word 產生完成:', outputFilename);
        return outputPath;
    } catch (error) {
        throw new Error('Word 轉換失敗: ' + error.message);
    }
}

// ============================================
// 匯出函式
// ============================================
module.exports = {
    markdownToHTML,
    generatePDF,
    generateWord
};
