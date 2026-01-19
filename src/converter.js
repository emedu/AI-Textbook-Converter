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

// 自訂 Markdown-it 渲染器以支援 TOC 錨點
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});

// 用於儲存生成的目錄項目
let tocItems = [];

// 覆寫標題渲染，自動加入 ID
md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const level = token.tag; // h1, h2...

    // 取得標題文字 (從下一個 token content 抓)
    const titleToken = tokens[idx + 1];
    const title = titleToken ? titleToken.content : '';

    // 產生唯一 ID (section-1, section-2...)
    // 為了簡單，我們使用全局計數器或隨機數，但在這裡我們用簡單的索引
    // 注意：因為 renderer 會被多次呼叫，每次轉換前需重置計數
    const slug = 'section-' + (tocItems.length + 1);

    // 只記錄 H1 和 H2 到目錄
    if (level === 'h1' || level === 'h2') {
        tocItems.push({
            level: level,
            title: title,
            slug: slug
        });
    }

    return `<${level} id="${slug}">`;
};


// ============================================
// Markdown 轉 HTML
// ============================================
function markdownToHTML(markdownContent) {
    // 重置目錄項目
    tocItems = [];

    // 將 Markdown 轉換為 HTML (這裡會觸發上面的 renderer 收集 tocItems)
    const htmlBody = md.render(markdownContent);

    // 生成目錄 HTML
    const tocHTML = generateTOCHTML(tocItems);

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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
            line-height: 1.9;
            color: #333;
            background: white;
            font-size: 14px;
        }

        /* ===== 目錄樣式 (TOC) - 仿書籍排版 ===== */
        .toc-container {
            page-break-after: always;
            margin-bottom: 40px;
            padding: 20px;
            background: #fff;
        }

        .toc-header {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }

        .toc-list {
            list-style: none;
            padding: 0;
        }

        .toc-item {
            display: flex;
            align-items: baseline;
            margin-bottom: 8px;
        }

        .toc-item.h1 {
            font-weight: bold;
            margin-top: 15px;
            font-size: 16px;
        }

        .toc-item.h2 {
            margin-left: 20px;
            font-size: 14px;
            color: #555;
        }

        .toc-link {
            text-decoration: none;
            color: inherit;
        }

        /* 點點引導線 */
        .toc-filler {
            flex-grow: 1;
            border-bottom: 1px dotted #999;
            margin: 0 10px;
            position: relative;
            top: -4px; /* 微調對齊 */
        }

        .toc-page {
            font-size: 12px;
            color: #888;
        }

        /* ===== 標題樣式 ===== */
        h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            border-bottom: 4px solid #3498db;
            padding-bottom: 12px;
            margin-top: 0;
            margin-bottom: 24px;
            page-break-before: always;
            page-break-after: avoid;
        }
        
        h1:first-of-type { page-break-before: avoid; }
        
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
        
        h3 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
        h4 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; }
        
        p { margin: 14px 0; text-align: justify; line-height: 2.0; }
        ul, ol { margin: 16px 0; padding-left: 32px; }
        li { margin: 10px 0; line-height: 1.8; }
        
        /* 表格樣式優化 */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            page-break-inside: avoid;
            font-size: 13px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }
        
        th {
            background: #3498db;
            color: white;
            padding: 14px 12px;
            border: 1px solid #2980b9;
        }
        
        td {
            border: 1px solid #ddd;
            padding: 12px;
        }
        
        tr:nth-child(even) { background: #f9f9f9; }

        /* 其他元素 */
        blockquote { border-left: 5px solid #3498db; background: #f8f9fa; padding: 16px; margin: 20px 0; }
        img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
        a { color: #3498db; text-decoration: none; }
        
        @media print {
            .toc-container { page-break-after: always; }
        }
    </style>
</head>
<body>
    ${tocHTML}
    ${htmlBody}
</body>
</html>
    `;

    return fullHTML;
}

// 產生目錄 HTML 結構
function generateTOCHTML(items) {
    if (items.length === 0) return '';

    let html = `
    <div class="toc-container">
        <div class="toc-header">目錄</div>
        <ul class="toc-list">
    `;

    items.forEach(item => {
        html += `
            <li class="toc-item ${item.level}">
                <a href="#${item.slug}" class="toc-link">${item.title}</a>
                <span class="toc-filler"></span>
                <span class="toc-page">⇲</span>
            </li>
        `;
    });

    html += `
        </ul>
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            (點擊標題可跳轉章節，完整頁碼請參閱 Word 檔)
        </div>
    </div>
    `;

    return html;
}

// ============================================
// 產生 PDF (使用 Puppeteer)
// ============================================
async function generatePDF(htmlContent, originalFilename) {
    console.log('  → 啟動 PDF 渲染引擎...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const outputFilename = originalFilename.replace('.md', '.pdf');
    const outputPath = path.join(__dirname, '../output/pdf', outputFilename);

    await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:10px;text-align:right;width:100%;margin-right:20px;">教材文件</div>',
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

    try {
        await execPromise('pandoc --version');
    } catch (error) {
        throw new Error('找不到 Pandoc! 請先安裝: https://pandoc.org/');
    }

    // 加入 --toc 指令以產生原生目錄
    // 使用 reference-doc 可以客製化樣式，但這裡使用預設
    const command = `pandoc "${markdownFilePath}" -o "${outputPath}" --toc --toc-depth=3`;

    try {
        await execPromise(command);
        console.log('  ✓ Word 產生完成:', outputFilename);
        return outputPath;
    } catch (error) {
        throw new Error('Word 轉換失敗: ' + error.message);
    }
}

module.exports = {
    markdownToHTML,
    generatePDF,
    generateWord
};
