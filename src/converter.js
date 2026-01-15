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
        /* ===== 基礎樣式 ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            background: white;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        /* ===== 標題樣式 ===== */
        h1 {
            font-size: 32px;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin: 40px 0 20px 0;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 26px;
            color: #34495e;
            border-left: 5px solid #3498db;
            padding-left: 15px;
            margin: 30px 0 15px 0;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 22px;
            color: #555;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
        }
        
        h4, h5, h6 {
            font-size: 18px;
            color: #666;
            margin: 20px 0 10px 0;
        }
        
        /* ===== 段落與文字 ===== */
        p {
            margin: 12px 0;
            text-align: justify;
        }
        
        /* ===== 列表樣式 ===== */
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
        }
        
        /* ===== 程式碼區塊 ===== */
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Consolas", "Courier New", monospace;
            font-size: 14px;
            color: #e74c3c;
        }
        
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        pre code {
            background: transparent;
            color: #ecf0f1;
            padding: 0;
        }
        
        /* ===== 表格樣式 ===== */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        th {
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        
        td {
            border: 1px solid #ddd;
            padding: 10px;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        /* ===== 引用區塊 ===== */
        blockquote {
            border-left: 4px solid #3498db;
            background: #f8f9fa;
            padding: 15px 20px;
            margin: 20px 0;
            font-style: italic;
            color: #555;
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
            margin: 20px auto;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* ===== 分隔線 ===== */
        hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 30px 0;
        }
        
        /* ===== 列印專用樣式 ===== */
        @media print {
            body {
                padding: 20px;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            pre, table, img {
                page-break-inside: avoid;
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
