# 📦 GitHub 同步說明

## ✅ 已完成的設定

您的專案已成功同步到 GitHub!

**GitHub 儲存庫**: https://github.com/emedu/AI-Textbook-Converter

---

## 📊 目前狀態

### Git 資訊
- **分支**: master
- **遠端儲存庫**: origin
- **已提交檔案**: 15 個
- **程式碼行數**: 4,834 行
- **提交訊息**: "🎉 初始提交: AI教材轉換系統 v1.0.0 (基礎版)"

### 已同步的檔案
- ✅ 所有程式碼檔案 (src/, public/)
- ✅ 設定檔案 (package.json, .env.example)
- ✅ 說明文件 (6 份 .md 檔案)
- ✅ 測試範例
- ✅ 啟動腳本

### 已忽略的檔案 (不會上傳到 GitHub)
- ❌ node_modules/ (太大,可重新安裝)
- ❌ .env (包含 API Key,不能公開)
- ❌ uploads/ (使用者上傳的檔案)
- ❌ output/ (產生的檔案)

---

## 🔄 日常使用 - 如何同步更新

### 當您修改了程式碼後

#### 步驟 1: 檢查修改了什麼
```bash
git status
```

#### 步驟 2: 加入修改的檔案
```bash
# 加入所有修改
git add .

# 或只加入特定檔案
git add src/server.js
```

#### 步驟 3: 提交修改
```bash
git commit -m "說明您做了什麼修改"
```

**範例**:
```bash
git commit -m "✨ 新增: 批次轉換功能"
git commit -m "🐛 修正: PDF 頁碼顯示問題"
git commit -m "📝 更新: 使用說明文件"
```

#### 步驟 4: 推送到 GitHub
```bash
git push
```

---

## 📥 從 GitHub 下載到其他電腦

### 第一次下載

```bash
# 複製整個專案
git clone https://github.com/emedu/AI-Textbook-Converter.git

# 進入資料夾
cd AI-Textbook-Converter

# 安裝套件
npm install

# 設定 API Key (編輯 .env 檔案)
# 然後就可以使用了!
```

### 更新到最新版本

如果專案已經在電腦上,只是想更新:

```bash
# 下載最新的程式碼
git pull
```

---

## 🎯 常用指令速查表

### 查看狀態
```bash
git status              # 查看目前修改了什麼
git log --oneline       # 查看提交歷史
git remote -v           # 查看遠端儲存庫
```

### 提交流程
```bash
git add .               # 加入所有修改
git commit -m "訊息"    # 提交修改
git push                # 推送到 GitHub
```

### 下載更新
```bash
git pull                # 從 GitHub 下載最新版本
```

### 查看差異
```bash
git diff                # 查看修改了什麼內容
```

---

## 🔐 安全提醒

### ⚠️ 絕對不要上傳的檔案

1. **`.env` 檔案** - 包含 API Key
2. **`node_modules/`** - 太大,可重新安裝
3. **個人資料** - 任何包含敏感資訊的檔案

### ✅ 已經設定好的保護

我已經建立了 `.gitignore` 檔案,會自動忽略:
- .env
- node_modules/
- uploads/
- output/

**所以您可以放心使用 `git add .`**,不會意外上傳敏感檔案!

---

## 📝 提交訊息建議

使用表情符號讓提交訊息更清楚:

- ✨ `:sparkles:` - 新功能
- 🐛 `:bug:` - 修正錯誤
- 📝 `:memo:` - 更新文件
- 🎨 `:art:` - 改善程式碼結構
- ⚡ `:zap:` - 效能改善
- 🔒 `:lock:` - 安全性修正
- ♻️ `:recycle:` - 重構程式碼

**範例**:
```bash
git commit -m "✨ 新增 AI 自動格式化功能"
git commit -m "🐛 修正 Word 目錄頁碼問題"
git commit -m "📝 更新安裝說明文件"
```

---

## 🌿 分支管理 (進階)

### 建立新分支開發新功能

```bash
# 建立並切換到新分支
git checkout -b feature/ai-enhancement

# 開發完成後,合併回主分支
git checkout master
git merge feature/ai-enhancement

# 推送到 GitHub
git push
```

---

## 🆘 常見問題

### Q: 忘記提交訊息怎麼辦?
```bash
# 修改最後一次提交訊息
git commit --amend -m "新的訊息"
```

### Q: 不小心加入了不該加的檔案?
```bash
# 從暫存區移除
git reset HEAD 檔案名稱
```

### Q: 想放棄所有修改?
```bash
# ⚠️ 危險!會刪除所有未提交的修改
git reset --hard HEAD
```

### Q: 推送失敗?
```bash
# 先下載最新版本
git pull

# 解決衝突後再推送
git push
```

### Q: 如何查看 GitHub 儲存庫?
直接在瀏覽器開啟:
https://github.com/emedu/AI-Textbook-Converter

---

## 🎉 完成!

您的專案現在已經:
- ✅ 儲存在本地 Git 儲存庫
- ✅ 同步到 GitHub 雲端
- ✅ 可以隨時下載到其他電腦
- ✅ 有完整的版本控制

**下次修改程式碼後,只要執行**:
```bash
git add .
git commit -m "說明修改內容"
git push
```

就可以同步到 GitHub 了! 🚀

---

**GitHub 儲存庫連結**: https://github.com/emedu/AI-Textbook-Converter
