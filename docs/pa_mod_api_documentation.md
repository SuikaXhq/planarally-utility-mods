# PlanarAlly (PA) Mod 架构解析与 API 文档

本文档基于 PlanarAlly 前端客户端的源码逻辑（主要位于 `client/src/mods/` 目录下），详细分析了当前 PA Mod 系统的生命周期、加载时序以及向开发者暴露的底层 API。

## 1. Mod 加载时序分析

PlanarAlly 的 Mod 是“基于房间（Room）”加载的，其加载时机严格晚于 Vue 核心前端框架的初始化。具体的启动链条如下：

1. **核心渲染阶段**：用户通过浏览器进入游戏路由，Vue 解析 `<Game />` 组件，立刻实例化并挂载所有常驻 UI（如侧边栏、工具条等）。
2. **网络链接阶段**：`Game.vue` 发起 Socket 连接。
3. **元数据握手阶段**：服务器返回 `"Room.Info.Set"` 事件，下发当前房间启用的 Mod 列表。
4. **资源获取与执行**：
   - 触发 `loadRoomMods` 逻辑。
   - 遍历 Mod 列表，使用 `import()` 语法动态、异步地从 `/static/mods/[id]/index.js` 下载预编译好的 ESM 模块。
   - 对每个下载完毕的 Mod，立即执行其 `init` 钩子。
5. **游戏状态同步阶段**：当所有 Mod 脚本加载完毕后，`gameOpened` 钩子被触发，向所有 Mod 下发 `initGame` 钩子，正式注入游戏核心 API。

> [!WARNING]
> **重要推论**：由于 Mod 的 JS 加载发生在一系列网络请求之后，且晚于 Vue `<Game />` 的初次渲染，因此 Mod 开发者**无法通过简单的 Monkey Patching 去安全地重写已经渲染的常驻 Vue 组件**。一切界面扩展必须依赖官方提供的注册 API。

---

## 2. Mod 生命周期钩子 (Lifecycle Events)

Mod 开发者可以在导出的 `events` 对象中声明以下生命周期钩子，PA 核心会在特定的阶段按顺序触发它们。

```typescript
export interface ModEvents {
    init?: (meta: ApiModMeta) => Promise<void>;
    initGame?: (data: GameApi) => Promise<void>;
    loadLocation?: () => Promise<void>;
    preTrackerUpdate?: (id: LocalId, tracker: Tracker, delta: Partial<Tracker>, syncTo: Sync) => Partial<Tracker>;
}
```

### `init(meta: ApiModMeta)`
*   **触发时机**：极早阶段。Mod 脚本文件刚刚被下载解析完毕后立即调用。
*   **用途**：环境检查、读取自身的 Metadata（名称、版本号等）、初始化纯逻辑的本地状态。此时不要尝试操作游戏逻辑或界面，因为相关的 API 尚未准备好。

### `initGame(gameApi: GameApi)`
*   **触发时机**：核心阶段。所有房间 Mod 加载完毕，且游戏的基础状态准备就绪时触发。
*   **用途**：**最核心的注入点**。此时你将获取 `GameApi` 对象。你应该在此处注册 UI 面板（如角色卡 Tab）、右键菜单，并与 PA 的状态管理系统（Systems）进行绑定。

### `loadLocation()`
*   **触发时机**：场景阶段。当玩家切换楼层/地图（Location），且新的 Babylon 画布及 Shape 渲染完成时触发。
*   **用途**：遍历或读取当前所在地图的具体 Token（Shape）数据，重新绑定地图维度的交互逻辑。

### `preTrackerUpdate(...)`
*   **触发时机**：拦截器阶段。这是一个同步的计算钩子，在任何 Shape 的“追踪器（Tracker，如血条、魔法值）”发生改变并准备同步前触发。
*   **用途**：数值拦截。你可以在此计算临时的 Buff、限制最大 HP 溢出、或对特定属性变化进行重定向。返回值（`Partial<Tracker>`）将覆盖原有的变化量。

---

## 3. GameApi 暴露对象说明

在 `initGame` 阶段，PA 传入的核心对象包含了以下几大类重要接口：

### 3.1 UI 扩展接口 (`ui.shape`)
用于在不破坏原生代码结构的前提下，向现有界面动态挂载自定义组件。
*   **`registerTab(tab: PanelTab, filter: (shape: LocalId) => boolean): void`**
    *   **作用**：在右侧属性面板（Shape Properties）中注册一个全新的标签页。
    *   **参数**：传入你的自定义 Vue 组件定义，以及一个过滤函数（决定哪些 Token 选中时会显示该 Tab）。
*   **`registerContextMenuEntry(entry: (shape: LocalId) => Section[]): void`**
    *   **作用**：在画布中右键点击一个 Token 时，向弹出的右键菜单中插入自定义选项。

### 3.2 游戏核心系统 (`systems` & `systemsState`)
直接暴露了 PA 内部的底层状态机。这是非常强大且危险的接口。
*   **`systems: Record<string, System>`**：包含了如 `gameSystem`, `floorSystem`, `playerSystem`, `roomSystem` 等内部逻辑对象。可以直接调用其方法改变游戏全局行为（例如强制锁房、发消息、切换层级）。
*   **`systemsState`**：暴露了核心系统的响应式数据层。你可以使用 Vue 的 `watch` 或 `computed` 来订阅这些状态的变化，从而实现 UI 同步。

### 3.3 图元访问器 (Shape API)
提供从运行时内存抓取具体实体（Token/图形）的能力。
*   **`getShape(shapeId: LocalId): IShape | undefined`**：通过本地 ID 拿到具体的 `IShape` 实例对象，从而读取坐标、图层、大小等底层渲染属性。
*   **`getGlobalId(id: LocalId): GlobalId | undefined`**：本地 ID 与多端同步的全局 ID 的转换器。

### 3.4 数据库交互接口 (ModDataBlockFunctions)
这是通过 `getDataBlockFunctions(meta.tag)` 解构出来的一组函数。
*   **作用**：PA 并不允许 Mod 直接操作底层 SQLite 或 Redis，而是提供了一套封装好的 `DataBlock` 机制。使用这组 API，你可以将 Mod 独有的数据（如装备栏、自定义技能状态）绑定到特定的 Shape ID 或全局环境上。PA 引擎会自动接管这些数据的多端 Socket 同步和数据库持久化存储。
