// ============================================
// 智能文字轉 Markdown 轉換器 (AI 增強版)
// ============================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 將純文字格式的教材自動轉換為標準 Markdown
 * 包含: 
 * 1. 自動移除舊目錄
 * 2. 透過 AI 識別並轉換表格
 * 3. 標題與列表結構化
 */
async function convertTextToMarkdown(plainText) {
    // 1. 移除原始檔案中的舊目錄
    let content = removeOldTOC(plainText);

    // 2. 透過 AI 處理潛在的表格區塊
    content = await processTablesWithAI(content);

    // 3. 處理標題與列表結構 (Regex 規則引擎)
    const lines = content.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            result.push('');
            continue;
        }

        // 如果這行已經被 AI 轉為 Markdown 表格 (以 | 開頭)，就直接保留
        if (entryIsTableAndProcessed(line)) {
            result.push(line);
            continue;
        }

        // 檢測標題層級
        const headingLevel = detectHeadingLevel(trimmedLine, i, lines);

        if (headingLevel > 0) {
            const cleanTitle = cleanTitleText(trimmedLine);
            // H1 自動換頁邏輯：如果是 H1，且不是第一行，則插入 Pandoc 強制換頁符號
            if (headingLevel === 1 && i > 0) {
                result.push('\n<!-- PAGE_BREAK -->\n'); // 使用通用分頁標記，稍後由不同轉換器處理
            }
            result.push('#'.repeat(headingLevel) + ' ' + cleanTitle);
        } else if (isListItem(trimmedLine)) {
            result.push(convertToListItem(trimmedLine));
        } else {
            result.push(trimmedLine);
        }
    }

    return result.join('\n');
}

/**
 * 移除舊的目錄區塊
 */
function removeOldTOC(text) {
    // 簡單邏輯：如果開頭 50 行內出現 "目錄" 且接著是一堆點點點的行，就把它們刪掉
    const lines = text.split('\n');
    let outputLines = [];
    let processingTOC = false;
    let tocFound = false;
    let keepLooking = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 只在前 100 行檢查目錄
        if (i > 100) keepLooking = false;

        if (keepLooking && !tocFound) {
            // 偵測目錄開始
            if (/^目錄/.test(line) || /^Table of Contents/.test(line)) {
                processingTOC = true;
                tocFound = true;
                continue; // 跳過這行
            }
        }

        if (processingTOC) {
            // 判斷目錄是否結束：如果遇到空行或是看起來像標題的內容
            // 寬鬆判斷：如果這行包含 "..." 或 "…" 且結尾是數字，視為目錄項目
            const isTOCItem = /[\.…]{2,}\s*\d+$/.test(line);

            // 如果遇到連續空行或不像目錄項目的內容，結束目錄刪除
            if (!line) {
                continue; // 忽略目錄中的空行
            }

            if (!isTOCItem && line.length > 5) {
                // 看到正常的內容了，結束目錄處理
                processingTOC = false;
                outputLines.push(lines[i]); // 保留這行
            }
            // 如果是 TOC Item，就跳過不加到 output
        } else {
            outputLines.push(lines[i]);
        }
    }

    return outputLines.join('\n');
}

/**
 * 使用 AI 識別並轉換表格
 * 先用簡單規則抓出「可能是表格」的文字塊，再送給 API
 */
async function processTablesWithAI(text) {
    // 為了節省 Token，我們先用正則切分出「疑似表格塊」
    // 特徵：連續多行，每行包含多個 Tab 或 2個以上的連續空白

    // 這裡為了演示精簡，我們把整個文本分段處理，或者只針對特定特徵段落呼叫 AI
    // 考慮到效能，我們只對「高機率是表格」的段落呼叫 AI

    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = [];
    let isPotentialTable = false;

    // 分塊邏輯
    let isExplicitTable = false; // 新增：是否處於強制表格模式

    for (const line of lines) {
        const trimmed = line.trim();

        // 0. 強制標記模式檢測
        // 支援 【表格開始】 或 [表格開始]
        if (trimmed === '【表格開始】' || trimmed === '[表格開始]') {
            // 如果之前有正在累積的內容，先結算為普通文字
            if (currentChunk.length > 0) {
                chunks.push({ type: 'text', content: currentChunk.join('\n') });
            }
            currentChunk = [];

            // 進入強制模式
            isExplicitTable = true;
            continue; // 不將標記本身加入內容
        }

        if (trimmed === '【表格結束】' || trimmed === '[表格結束]') {
            if (isExplicitTable) {
                // 結束強制表格模式 - 這塊內容絕對是表格
                if (currentChunk.length > 0) {
                    chunks.push({ type: 'table_candidate', content: currentChunk.join('\n') });
                }
                currentChunk = [];
                isExplicitTable = false;
                continue;
            }
        }

        if (isExplicitTable) {
            // 如果在強制模式下，無條件收集所有內容
            currentChunk.push(line);
            continue;
        }

        // 當不在標記模式內時，所有內容視為一般文字，不進行自動偵測
        currentChunk.push(line);
    }

    // 結尾收尾
    if (currentChunk.length > 0) {
        chunks.push({ type: 'text', content: currentChunk.join('\n') });
    }

    // 處理每個區塊
    let finalContent = '';

    for (const chunk of chunks) {
        if (chunk.type === 'table_candidate' && chunk.content.split('\n').length >= 2) {
            // 呼叫 Gemini 轉換表格
            try {
                const mdTable = await callGeminiToConvertTable(chunk.content);
                finalContent += '\n' + mdTable + '\n';
            } catch (e) {
                console.error('AI 表格轉換失敗，保留原文:', e);
                finalContent += '\n' + chunk.content + '\n';
            }
        } else {
            finalContent += '\n' + chunk.content + '\n';
        }
    }

    return finalContent;
}

async function callGeminiToConvertTable(textChunk) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // 使用較快的模型

    const prompt = `
    請將以下的純文字內容轉換為標準的 Markdown 表格。
    
    重點規則：
    1. 即使是垂直排列的清單（例如："構造"下一行是"位置"），如果在邏輯上這應該是一個表格，請把它還原為表格。
    2. 如果是一般的條列式重點，請保持原樣或轉為 Markdown 列表，不要硬轉為表格。
    3. 只輸出 Markdown 表格代碼，不要有任何解釋或其他文字。
    4. 如果這段文字完全不包含表格資訊，請原樣輸出原文。
    
    原文內容：
    ${textChunk}
    `;

    // 實作簡單的重試機制 (最多重試 3 次)
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // 清理回應 (移除可能的 markdown code block 標記)
            text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/```$/, '');
            return text.trim();
        } catch (error) {
            console.log(`⚠️ AI 請求失敗 (嘗試 ${i + 1}/${maxRetries}):`, error.message);
            lastError = error;
            if (error.message.includes('429')) {
                // 如果是 Rate Limit，等待長一點時間 (10s, 20s, 30s)
                await new Promise(resolve => setTimeout(resolve, (i + 1) * 10000));
            } else {
                // 其他錯誤等待 2 秒
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    throw lastError; // 重試失敗，拋出異常以便上層處理 (保留原文)
}

function isMajorSection(line) {
    return /^(導論|前言|序言|附錄|結語|總結|結論|參考文獻)[:：]?/.test(line) ||
        /^第[一二三四五六七八九十\d]+章[:：]?/.test(line);
}

function detectHeadingLevel(line, lineIndex, allLines) {
    if (isMajorSection(line)) return 1;

    const numberMatch = line.match(/^(\d+(?:\.\d+)*)[.\s]+(.+)/);
    if (numberMatch) {
        const depth = numberMatch[1].split('.').length;
        if (depth === 1) return 2;
        if (depth === 2) return 3;
        if (depth === 3) return 4;
        return 5;
    }
    return 0;
}

function cleanTitleText(text) {
    return text
        .replace(/[.…]+\d+$/, '')
        .replace(/[.…]+$/, '')
        .replace(/[:：]\s*$/, '')
        .trim();
}

function isListItem(line) {
    return /^[•●○◦▪▫-]\s/.test(line) || /^[\da-z]+[.)]\s/.test(line);
}

function convertToListItem(line) {
    if (line.startsWith('- ')) return line;
    return '- ' + line.replace(/^[•●○◦▪▫-]\s*/, '').replace(/^[\da-z]+[.)]\s*/, '');
}

function entryIsTableAndProcessed(line) {
    return line.trim().startsWith('|') && line.includes('|', 1);
}

module.exports = {
    convertTextToMarkdown
};
