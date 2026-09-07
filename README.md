# 深海

基于 Vue 3、TypeScript、Vite、Element Plus 和 UnoCSS 构建的 深海 简易对话应用。

![聊天界面](./docs/image1.png)

## 功能

- 支持多轮对话
- 支持 SSE 流式输出与手动中断
- 回复过程中自动滚动，并在末尾显示生成光标
- 支持 Markdown、数学公式、代码高亮和代码复制
- 支持 DeepSeek 推理内容展示
- 会话历史保存在浏览器本地存储

## 本地运行

```bash
pnpm install
pnpm dev
```

## 配置

在 `.env` 中配置 DashScope API 地址和密钥：

```bash
VITE_APP_API_BASE_URL=https://dashscope.aliyuncs.com
VITE_APP_API_KEY=sk-************************
```

## 演示

![流式回复](./docs/image-sse)
![推理内容](./docs/image2.png)
![代码与公式](./docs/image3.png)
![会话管理](./docs/image4.png)
