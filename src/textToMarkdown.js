// ============================================
// 智能文字轉 Markdown 轉換器
// ============================================

/**
 * 將純文字格式的教材自動轉換為標準 Markdown
 * 自動識別標題、列表、段落等結構
 */
function convertTextToMarkdown(plainText) {
    const lines = plainText.split('\n');
    const result = [];
    let inTOC = false; // 是否在目錄區域
    let tocEnded = false; // 目錄是否已結束
    let consecutiveEmptyLines = 0; // 連續空行計數

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 處理空行
        if (!trimmedLine) {
            consecutiveEmptyLines++;
            result.push('');

            // 如果在目錄中遇到連續2個以上空行，目錄結束
            if (inTOC && consecutiveEmptyLines >= 2) {
                inTOC = false;
                tocEnded = true;
            }
            continue;
        }

        // 重置連續空行計數
        consecutiveEmptyLines = 0;

        // 檢測是否進入目錄區域
        if (!tocEnded && /^目錄[:：]?$/.test(trimmedLine)) {
            inTOC = true;
            result.push('# ' + trimmedLine);
            continue;
        }

        // 如果在目錄區域，保持原樣（不轉換為標題）
        if (inTOC) {
            result.push(trimmedLine);
            continue;
        }

        // 檢測標題層級
        const headingLevel = detectHeadingLevel(trimmedLine, i, lines);

        if (headingLevel > 0) {
            // 移除行尾的點點點和頁碼
            const cleanTitle = cleanTitleText(trimmedLine);
            result.push('#'.repeat(headingLevel) + ' ' + cleanTitle);
        } else if (isListItem(trimmedLine)) {
            // 列表項目
            result.push(convertToListItem(trimmedLine));
        } else {
            // 普通段落
            result.push(trimmedLine);
        }
    }

    return result.join('\n');
}

/**
 * 判斷是否為主要章節（導論、第X章、附錄等）
 */
function isMajorSection(line) {
    return /^(導論|前言|序言|附錄|結語|總結|結論)[:：]/.test(line) ||
        /^第[一二三四五六七八九十\d]+章[:：]/.test(line);
}

/**
 * 偵測標題層級
 * @returns {number} 0=非標題, 1-6=標題層級
 */
function detectHeadingLevel(line, lineIndex, allLines) {
    // 規則 1: 主要章節 -> H1（最高優先級）
    if (isMajorSection(line)) {
        return 1;
    }

    // 規則 2: 純數字編號開頭（修正版，支援多層編號）
    // 1. xxx -> H2
    // 1.1 xxx -> H3
    // 1.1.1 xxx -> H4
    const numberMatch = line.match(/^(\d+(?:\.\d+)*)[.\s]+(.+)/);
    if (numberMatch) {
        const numberParts = numberMatch[1].split('.');
        const depth = numberParts.length;

        if (depth === 1) {
            return 2; // 1. -> H2
        } else if (depth === 2) {
            return 3; // 1.1, 1.2, 2.1 -> H3
        } else if (depth === 3) {
            return 4; // 1.1.1 -> H4
        } else {
            return 5; // 更深層級
        }
    }

    // 規則 3: 如果這一行很短（< 30字）且下一行是內容，可能是小標題
    if (line.length < 30 && lineIndex < allLines.length - 1) {
        const nextLine = allLines[lineIndex + 1].trim();
        // 如果下一行是段落內容（較長），這行可能是小標題
        if (nextLine.length > 30 && !nextLine.match(/^[\d.]+\s/)) {
            return 3;
        }
    }

    return 0; // 不是標題
}

/**
 * 清理標題文字（移除頁碼、點點等）
 */
function cleanTitleText(text) {
    return text
        .replace(/[.…]+\d+$/, '')  // 移除結尾的 ...1, ....23 等
        .replace(/[.…]+$/, '')      // 移除結尾的點點點
        .replace(/[:：]\s*$/, '')   // 移除結尾的冒號（保留中間的）
        .trim();
}

/**
 * 判斷是否為列表項目
 */
function isListItem(line) {
    // 檢查是否以常見的列表符號開頭
    return /^[•●○◦▪▫-]\s/.test(line) ||
        /^[\da-z]+[.)]\s/.test(line);
}

/**
 * 轉換為 Markdown 列表格式
 */
function convertToListItem(line) {
    // 如果已經是 - 開頭，保持原樣
    if (line.startsWith('- ')) {
        return line;
    }

    // 移除原有的符號，統一用 -
    return '- ' + line.replace(/^[•●○◦▪▫-]\s*/, '')
        .replace(/^[\da-z]+[.)]\s*/, '');
}

module.exports = {
    convertTextToMarkdown
};
