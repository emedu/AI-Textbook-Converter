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
    // 1. 根據標記物切分目錄區與正文區
    const { tocContent, mainContent } = extractSectionsUsingMarkers(plainText);

    // 2. 透過 AI 處理正文中的表格 (僅針對正文區)
    const processedMainContent = await processTablesWithAI(mainContent);

    // 3. 處理標題與列表結構 (Regex 規則引擎)
    let lines = processedMainContent.split('\n');
    const result = [];

    // 如果有自定義目錄區，先處理目錄區 (如果使用者需要將目錄區也轉為 MD)
    // 但通常系統會自動生成目錄，所以這裡我們主要確保正文完整

    let contentStarted = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 徹底過濾掉任何包含標記物的行，不讓它們出現在成品中
        if (trimmedLine.includes('【') && trimmedLine.includes('】')) continue;

        if (!trimmedLine && !contentStarted) continue;
        contentStarted = true;

        if (entryIsTableAndProcessed(line)) {
            result.push(line);
            continue;
        }

        const headingLevel = detectHeadingLevel(trimmedLine, i, lines);

        if (headingLevel > 0) {
            const cleanTitle = cleanTitleText(trimmedLine);
            // H1 自動換頁邏輯
            if (headingLevel === 1 && result.length > 0) {
                result.push('\n<!-- PAGE_BREAK -->\n');
            }
            // 強制標題前後有空行，這對 Word (Pandoc) 識別至關重要
            result.push('\n' + '#'.repeat(headingLevel) + ' ' + cleanTitle + '\n');
        } else if (isListItem(trimmedLine)) {
            result.push(convertToListItem(trimmedLine));
        } else {
            result.push(trimmedLine);
        }
    }

    // 清理多餘的連續空行
    return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * 根據使用者標記 【目錄開始】【正文開始】 提取內容
 * 確保數據 0 誤刪
 */
function extractSectionsUsingMarkers(text) {
    const lines = text.split('\n');
    let mainContent = "";

    const tocStartIdx = lines.findIndex(l => l.trim().includes('【目錄開始】'));
    const tocEndIdx = lines.findIndex(l => l.trim().includes('【目錄結束】'));
    const mainStartIdx = lines.findIndex(l => l.trim().includes('【正文開始】'));

    // 邏輯 1：如果有明確的【正文開始】，這最安全
    if (mainStartIdx !== -1) {
        mainContent = lines.slice(mainStartIdx + 1).join('\n');
        return { mainContent };
    }

    // 邏輯 2：如果只有【目錄開始】或【目錄結束】
    // 我們必須把目錄區塊剪掉，否則目錄裡的「第一章」會被誤認為正文標題，導致目錄重複
    if (tocStartIdx !== -1) {
        let actualStart = 0;
        if (tocEndIdx !== -1) {
            actualStart = tocEndIdx + 1;
        } else {
            // 如果忘了寫結束，我們找下一個明顯的標題或空行之後
            actualStart = tocStartIdx + 1;
            // 往後找 20 行，看有沒有重複出現的標題
            const rest = lines.slice(tocStartIdx + 1);
            for (let i = 0; i < Math.min(rest.length, 50); i++) {
                if (isMajorSection(rest[i].trim())) {
                    actualStart = tocStartIdx + 1 + i;
                    break;
                }
            }
        }
        mainContent = lines.slice(actualStart).join('\n');
    } else {
        // 邏輯 3：完全沒標記，全量保留
        mainContent = text;
    }

    return { mainContent };
}

/**
 * 移除舊的目錄區塊
 */
// removeOldTOC 函式已廢棄，改用標記物引導

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
    return /^第[一二三四五六七八九十\d]+章/.test(line) ||
        /^《.+》$/.test(line) ||
        /^(導論|前言|序言|附錄|結語|總結|結論|參考文獻)[:：]?$/.test(line);
}

function detectHeadingLevel(line, lineIndex, allLines) {
    const trimmed = line.trim();
    if (!trimmed) return 0;

    // **關鍵安全鎖**：標題若超過 45 個字，極可能是內文誤判，強制設為 0
    if (trimmed.length > 45) return 0;

    // H1: 第一章 或 《書名》
    if (isMajorSection(trimmed)) return 1;

    // H2: 第一節
    if (/^第[一二三四五六七八九十\d]+節/.test(trimmed)) return 2;

    // 處理數字型標題 (1.1, 1.1.1)
    const numberMatch = trimmed.match(/^(\d+(?:\.\d+)+)[.\s]+(.+)/);
    if (numberMatch) {
        const depth = numberMatch[1].split('.').length;
        if (depth === 2) return 3; // 1.1 -> H3
        return depth + 1;
    }

    // H3: 第一步 或 特殊符號加粗
    if (/^第[一二三四五六七八九十\d]+(步|步驟)/.test(trimmed)) return 3;
    if (/^[●○]\s/.test(trimmed)) return 3;

    return 0;
}

function cleanTitleText(text) {
    return text
        .replace(/[.…]+\d+$/, '')
        .replace(/[.…]+$/, '')
        .replace(/[:：]\s*$/, '')
        .trim();
}

// 檢查是否為列表項目 (1. 2. 3. 或 - 或 * 或 ●)
function isListItem(line) {
    return /^[\d一二三四五六七八九十]+\.\s/.test(line) ||
        /^[●○\-*]\s/.test(line);
}

// 轉換為 Markdown 列表格式 (不再強制轉為 -，保留原貌以防有序列表需求)
function convertToListItem(line) {
    const trimmed = line.trim();
    // 如果是數字開頭，保持原本數字編號
    if (/^[\d一二三四五六七八九十]+\.\s/.test(trimmed)) {
        return trimmed;
    }
    // 其他轉為標準 Markdown 列表符號
    return '- ' + trimmed.replace(/^[●○\-*]\s/, '');
}

function entryIsTableAndProcessed(line) {
    return line.trim().startsWith('|') && line.includes('|', 1);
}

module.exports = {
    convertTextToMarkdown
};
