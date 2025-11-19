<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1edxe_PhufS2OXbJKql1wrpipcmOIcw73

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 部署到 GitHub Pages

若遇到 GitHub Pages 建置錯誤 `No such file or directory @ dir_chdir0 - /github/workspace/docs`，表示 Pages 設定使用 `docs/` 目錄當成網站來源，但倉庫裡尚未建立。

### 步驟
1. 生成靜態檔案並建立 `docs/`：
   ```bash
   npm run build:docs
   ```
   這會執行 `vite build`，將產生的 `dist/` 複製到 `docs/`，並建立 `.nojekyll` 以停用 Jekyll 處理。
2. Commit & push 變更：
   ```bash
   git add docs package.json
   git commit -m "chore: add docs build for GitHub Pages"
   git push origin main
   ```
3. 前往 GitHub 專案 Settings → Pages：
   - Source 選擇 `Deploy from a branch`
   - Branch 選擇 `main`，資料夾選 `docs/`
4. 儲存後等待部署完成（首次約需數十秒）。

### 之後更新部署
每次修改程式碼後：
```bash
npm run build:docs && git add docs && git commit -m "build: update docs" && git push
```

### 如需使用自訂網域 / HTTPS
在 Pages 設定中加入自訂網域並等待 DNS 生效；GitHub 會自動簽發憑證。

### 疑難排除
- 若資源 404：確認 `docs/index.html` 中的路徑是否與 Vite 預設 (相對路徑) 一致。
- 若仍被 Jekyll 處理導致檔案遺失：確認 `docs/.nojekyll` 存在。
- 若大檔案或路徑大小寫異常：Git clone 時注意大小寫，Pages 對大小寫敏感。
