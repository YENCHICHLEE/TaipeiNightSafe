# 遷移到 Vite + TypeScript

## 已完成的變更

1. ✅ 建立 Vite 配置檔案 (`vite.config.ts`)
2. ✅ 建立 TypeScript 配置檔案 (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
3. ✅ 建立 ESLint 配置檔案 (`eslint.config.js`)
4. ✅ 更新 `package.json` 使用 Vite 腳本
5. ✅ 將 `src/index.js` 轉換為 `src/main.tsx`
6. ✅ 將 `src/App.js` 轉換為 `src/App.tsx` 並加入類型定義
7. ✅ 建立 `src/types.ts` 定義 API 回應類型
8. ✅ 將 `public/index.html` 移至根目錄並更新為 Vite 格式

## 安裝步驟

### 1. 刪除舊的依賴和檔案

```bash
cd road-safety-frontend
rm -rf node_modules package-lock.json
rm -rf public/index.html src/index.js src/App.js
```

### 2. 安裝新的依賴

```bash
npm install
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

應用程式將在 http://localhost:3000 啟動

### 4. 其他指令

- 建置生產版本: `npm run build`
- 預覽生產版本: `npm run preview`
- 執行 ESLint: `npm run lint`
- 類型檢查: `npm run typecheck`

## 主要變更說明

### Vite 配置
- 開發伺服器預設在 port 3000
- 設定 proxy 將 API 請求轉發到 `http://localhost:5001`

### TypeScript
- 所有 `.js` 檔案已轉換為 `.tsx`
- 新增類型定義檔案 `src/types.ts`
- 啟用嚴格模式類型檢查

### 依賴變更
- 移除 `react-scripts` 和相關測試套件
- 新增 Vite 和 TypeScript 相關依賴
- 保留所有原有的功能依賴 (axios, leaflet, react-leaflet)

## 注意事項

- 確保後端 API 伺服器在 `http://localhost:5001` 運行
- 如果遇到類型錯誤，執行 `npm run typecheck` 檢查
