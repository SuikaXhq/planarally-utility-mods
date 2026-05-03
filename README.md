# PlanarAlly Utility Mods

这是一个为 [PlanarAlly](https://github.com/Kuehbe/PlanarAlly) 开发的功能扩展（Mods）合集。采用 Monorepo 结构管理，旨在提供更丰富的角色管理、UI 交互和自动化工具。

## 项目结构

本仓库使用 `pnpm workspaces` 进行包管理：

-   **`packages/advanced-char-sheet`**: **高级角色卡模块**。提供深度集成、响应式设计的 D&D 5E 风格角色卡。
-   **`packages/ui`**: **通用 UI 组件库**。包含 Table、Button、Tooltip、TagInput 等专为 PlanarAlly 设计的 UI 组件，确保各模块视觉风格统一。
-   **`packages/api`**: **核心 API 封装**。对 PlanarAlly Mod API 的二次封装，提供更便捷的数据同步、状态管理和交互接口。

## 核心模块：高级角色卡 (Advanced Char Sheet)

`advanced-char-sheet` 是本项目的主要模块，具有以下特性：

-   **全方位同步**：与 PlanarAlly 的 Tracker 系统深度绑定。HP、AC、职业生命骰、特性使用次数等数据实现双向实时同步。
-   **动态职业管理**：支持兼职（Multi-classing），自动计算总等级、熟练加值，并按职业管理生命骰。
-   **高度可扩展的记录系统**：可自由添加“特性”与“能力”，并为每个项目开启独立的 Tracker 追踪。
-   **自动化战斗辅助**：一键进行属性检定、技能检定及武器攻击/伤害掷骰。
-   **国际化支持**：完整支持中英文切换。
-   **极致体验**：支持折叠面板、移动端适配布局、删除确认逻辑以及详细的 Tooltip 提示。

## 开发与构建

### 环境要求

-   [Node.js](https://nodejs.org/) (v18+)
-   [pnpm](https://pnpm.io/) (v8+)

### 快速开始

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/SuikaXhq/planarally-utility-mods.git
    cd planarally-utility-mods
    ```

2.  **安装依赖**:
    ```bash
    pnpm install
    ```

3.  **启动开发模式**:
    在指定包目录下运行，或在根目录统一运行（需配置脚本）：
    ```bash
    cd packages/advanced-char-sheet
    pnpm run dev
    ```

4.  **构建发布包**:
    ```bash
    pnpm run build
    ```
    构建完成后，会在对应包的 `dist` 目录下生成打包好的 `.pa-mod` 或相应格式的文件。

## 贡献指南

1.  UI 组件请优先使用 `packages/ui` 中的现有组件以保持一致性。
2.  数据同步逻辑请统一在 `SyncManager` 中处理，遵循双向绑定原则。
3.  新增翻译项需同时在 `zh.json` 和 `en.json` 中更新。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
