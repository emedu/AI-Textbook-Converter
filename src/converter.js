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
    typographer: true,
    breaks: true // 強制將換行轉換為 <br>，解決內文變成一整塊的問題
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
    let htmlBody = md.render(markdownContent);

    // 重點快優化 (💡, ⚠️, 🎓 等圖示自動轉為色塊)
    htmlBody = htmlBody.replace(/<p>(💡|⚠️|📌|✅|❌|👉|🔍|🔬|📖|🎓|⛔|👨\u200D🏫)(.*?)<\/p>/g, (match, icon, text) => {
        let type = 'info';
        if (icon === '⚠️' || icon === '⛔') type = 'warning';
        if (icon === '💡' || icon === '🎓' || icon === '👨\u200D🏫') type = 'tip';
        if (icon === '✅') type = 'success';
        if (icon === '📌' || icon === '👉') type = 'note';

        return `<div class="callout ${type}">
            <span class="callout-icon">${icon}</span>
            <div class="callout-content">${text}</div>
        </div>`;
    });

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
            font-family: "Noto Sans TC", "Inter", "Segoe UI", "Microsoft JhengHei", sans-serif;
            line-height: 1.8;
            color: #2c3e50;
            background: #f0f2f5; 
            padding: 40px 20px;
        }

        .page-content {
            background: white;
            max-width: 1000px;
            margin: 0 auto;
            padding: 70px 80px;
            box-shadow: 0 15px 45px rgba(0,0,0,0.08);
            min-height: 1100px;
            border-radius: 4px;
        }

        /* ===== 目錄樣式 (TOC) - 精化版 ===== */
        .toc-container {
            page-break-after: always;
            margin-bottom: 80px;
            padding: 40px;
            border: 1px solid #eef2f6;
            background: #ffffff;
            border-radius: 8px;
        }

        .toc-header {
            text-align: center;
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 50px;
            color: #1a4a7c;
            letter-spacing: 4px;
        }

        .toc-list { list-style: none; padding: 0; }

        .toc-item {
            display: flex;
            align-items: center;
            margin-bottom: 14px;
            overflow: hidden;
        }

        .toc-item.h1 {
            font-weight: 800;
            margin-top: 25px;
            font-size: 18px;
            color: #1a4a7c;
        }

        .toc-item.h2 {
            margin-left: 30px;
            font-size: 15.5px;
            color: #4a5568;
            font-weight: 500;
        }

        .toc-link {
            text-decoration: none;
            color: inherit;
            /* 移除 ellipsis，允許長標題正常換行 */
            line-height: 1.4;
            flex: 1;
        }

        .toc-filler {
            flex-grow: 1;
            border-bottom: 1px dotted #cbd5e0;
            margin: 0 15px;
            position: relative;
            top: -4px;
        }

        .toc-page {
            font-size: 14px;
            color: #718096;
            font-family: serif;
            font-weight: normal;
        }

        /* ===== 標題樣式 (精品書籍風格) ===== */
        h1 {
            font-size: 30px;
            font-weight: 900;
            color: #1a4a7c;
            margin: 60px 0 35px 0;
            padding-bottom: 15px;
            border-bottom: 5px solid #1a4a7c;
            page-break-before: always;
        }

        h1:first-of-type { 
            page-break-before: avoid; 
            margin-top: 0;
        }
        
        h2 {
            font-size: 24px;
            font-weight: 800;
            color: #1a4a7c;
            padding: 10px 0;
            margin: 50px 0 25px 0;
            border-top: 1px solid #dee2e6;
            border-bottom: 1px solid #dee2e6;
            letter-spacing: 1px;
            page-break-after: avoid;
        }
        
        h3 { 
            font-size: 19px; 
            font-weight: 800;
            margin-top: 35px; 
            margin-bottom: 18px; 
            color: #334e68;
            padding-left: 10px;
            border-left: 4px solid #334e68;
        }

        /* ===== 重點提示塊 (Callouts) ===== */
        .callout {
            display: flex;
            margin: 35px 0;
            padding: 22px 28px;
            border-radius: 4px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-left-width: 6px;
            page-break-inside: avoid;
        }
        
        .callout.tip { background: #f0fff4; border-color: #c6f6d5; border-left-color: #38a169; }
        .callout.warning { background: #fff5f5; border-color: #fed7d7; border-left-color: #e53e3e; }
        .callout.info { background: #ebf8ff; border-color: #bee3f8; border-left-color: #3182ce; }
        .callout.note { background: #fffaf0; border-color: #feebc8; border-left-color: #dd6b20; }

        .callout-icon {
            font-size: 24px;
            margin-right: 22px;
            line-height: 1.2;
        }
        
        .callout-content {
            flex: 1;
            font-size: 15.5px;
            color: #2d3748;
        }
        
        .callout-content p { margin: 0; }

        p { margin: 25px 0; text-align: justify; word-break: break-all; }
        ul, ol { margin: 25px 0; padding-left: 30px; }
        li { margin: 15px 0; }
        
        /* 表格樣式優化 */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 40px 0;
            page-break-inside: avoid;
            font-size: 14.5px;
        }
        
        th {
            background: #f8f9fa;
            color: #1a4a7c;
            padding: 15px;
            border-top: 2px solid #1a4a7c;
            border-bottom: 1px solid #dee2e6;
            text-align: left;
            font-weight: 800;
        }
        
        td {
            border-bottom: 1px solid #edf2f7;
            padding: 15px;
            color: #4a5568;
        }
        
        tr:nth-child(even) { background: #fdfdfe; }

        /* 其他元素 */
        blockquote { border-left: 5px solid #cbd5e0; color: #4a5568; padding: 15px 25px; margin: 30px 0; font-style: italic; background: #fcfcfc; }
        img { max-width: 100%; height: auto; border-radius: 2px; display: block; margin: 40px auto; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.1)); }
        
        @media print {
            body { background: white; padding: 0; }
            .page-content { box-shadow: none; padding: 0; width: 100%; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="page-content">
        ${tocHTML}
        ${htmlBody}
    </div>
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
