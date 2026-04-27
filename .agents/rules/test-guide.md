---
trigger: always_on
---

编写完代码后触发：
1. 不需要执行`pnpm run build`等构建命令，默认已经运行了`pnpm run dev`实时更新代码修改
2. UI修改结果可以直接在浏览器中（使用chrome-devtools-mcp）查看效果，先查看目前的页面再进行下一步操作，不要从零开始操作网页，可以要求人进行一些agent难以进行的操作（如滚动、拖动窗口等）