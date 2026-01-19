# 實作計畫: 優化目錄生成與表格識別

## 目標
1.  **目錄自動化與美化**: 捨棄原始檔案中的舊目錄，改由系統自動生成頁碼正確、靠右對齊且有點點引導線的目錄。
2.  **表格 AI 識別**: 將純文字格式的表格內容透過 Gemini API 轉換為標準 Markdown 表格，以利正確排版。

## 用戶審查重點
> [!IMPORTANT]
> **API Key 確認**: 表格識別功能將重新啟用 Gemini API。請確認 `.env` 中的 API Key 有效且有足夠額度。

> [!NOTE]
> **圖片處理**: 本次更新不包含圖片插入功能的變更，維持現狀（建議用戶在 Word 中後製）。

---

## 預計變更

### 1. 目錄優化 (TOC)

#### [MODIFY] [converter.js](file:///d:/project/AI教材轉換專案115/src/converter.js)
*   **CSS Update**: 新增 `.toc` 相關樣式，實作「Flex 佈局 + 點點引導線」效果。
*   **HTML Generation**: 在 `markdownToHTML` 流程中，自動掃描所有 `h1`, `h2` 標籤，並在文件開頭插入一個自動生成的 `<div class="toc">...</div>` 區塊。
*   **PDF Link**: 確保目錄項目這成內連錨點 (`#link`)，點擊可跳轉。

#### [MODIFY] [textToMarkdown.js](file:///d:/project/AI教材轉換專案115/src/textToMarkdown.js)
*   **Remove Old TOC**: 新增邏輯，若偵測到原始文字中包含「目錄」區塊，自動將其移除，避免與新生成的目錄重複。

### 2. 表格識別 (AI Powered)

#### [MODIFY] [textToMarkdown.js](file:///d:/project/AI教材轉換專案115/src/textToMarkdown.js)
*   **AI Integration**: 引入 Gemini API 呼叫邏輯。
*   **Hybrid Logic**:
    1.  先用 Regex 處理標題與列表（速度快）。
    2.  將剩餘的「疑似表格區塊」（例如多行包含大量空白或對齊的文字）切分出來。
    3.  呼叫 AI 將這些區塊轉換為 Markdown Table。
    4.  合併回文中。

#### [MODIFY] [server.js](file:///d:/project/AI教材轉換專案115/src/server.js)
*   **Async Handling**: 表格識別需要呼叫 API，需將轉換流程調整為 Async/Await 結構以等待 AI 回應。

---

## 驗證計畫

### 自動化測試
1.  **目錄測試**: 準備一個包含多章節的純文字檔，轉換後檢查 PDF：
    *   是否有自動生成目錄？
    *   目錄是否有點點線？
    *   頁碼是否靠右？
    *   標題是否可點擊跳轉？
    *   舊的文字目錄是否已消失？

2.  **表格測試**: 準備一個包含「亂排版表格」的純文字檔，轉換後檢查：
    *   是否成功轉為 Markdown 表格格式？
    *   PDF/Word 中是否呈現為格線清晰的表格？

### 手動驗證
*   由用戶提供範例檔案進行轉換測試，確認符合預期 (如圖2效果)。
