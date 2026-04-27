# PlanarAlly System 设计逻辑

PlanarAlly (PA) 采用了一种高度模块化的 **System (系统)** 架构来管理复杂的游戏逻辑和数据。这种设计模式确保了功能的解耦、状态的可预测性以及高效的跨端同步。

## 1. 核心理念：数据去中心化

在 PA 中，没有一个巨大的、包含所有信息的单一状态树。相反，数据被拆分到了各个专门的 System 中：
- `TrackerSystem`: 管理生命值、经验值等条状数值。
- `CustomDataSystem`: 管理用户自定义的 KV 键值对。
- `CharacterSystem`: 管理角色（Character）与物体（Shape）的映射关系。
- `DiceSystem`: 管理骰子工具及其 3D 渲染。

这种设计使得新增功能只需要增加一个新的 System，而不需要修改核心 Shape 逻辑。

## 2. 系统生命周期与 ShapeSystem 接口

大多数系统都实现了 `ShapeSystem` 接口，这使得它们能挂载到 Shape 的生命周期中：

- **序列化与反序列化**:
    - `fromServerShape`: 当 Shape 从服务器加载时，各系统负责解析属于自己的那部分数据。
    - `toServerShape`: 当 Shape 需要同步到服务器时，系统将内存中的数据转换为传输格式。
- **状态激活**:
    - `loadState(id)` / `dropState()`: 当用户在 UI 中选中某个 Shape 时，系统会将该 Shape 的数据“激活”到响应式状态（Reactive State）中，供 Vue 组件渲染。

## 3. 响应式与非响应式状态的分离

PA 系统通常将状态分为两部分：
- **原始数据 (Internal Data)**: 通常存储在 `Map<LocalId, T>` 中。这是所有数据的“源头”，保证了非激活状态下的 Shape 数据依然存在于内存中。
- **响应式状态 (Reactive State)**: 通过 `buildState` 辅助函数创建。只有当前被选中或正在编辑的 Shape 数据会被映射到这里。这样可以极大减少 Vue 监听的对象数量，提升大规模地图下的性能。

## 4. 同步机制 (Sync Mode)

PA 的修改操作通常接收一个 `Sync` 对象：
```typescript
interface Sync {
    ui: boolean;     // 是否更新本地 UI 状态
    server: boolean; // 是否将更改通过 Socket 发送给服务器
}
```
这种设计允许系统区分：
- **用户主动操作**: `ui: true, server: true`（本地更新并告诉服务器）。
- **同步远程操作**: `ui: true, server: false`（仅更新本地，因为数据是从服务器传来的，不需要再发回去）。

## 5. 事件钩子 (Event Hooks)

某些系统（如 `trackers`）提供了预处理钩子（如 `preTrackerUpdate`）。这允许 Mod 或其他系统在数据真正写入之前拦截并修改它。这是 Mod 实现自动化逻辑（如“当 HP 归零时自动打上击倒标记”）的关键。

## 6. 在 Mod API 中的体现

Mod 通过 `GameApi` 访问这些系统。API 暴露了系统的方法（如 `tracker.update`）和状态（如 `systemsState.trackers.reactive`），使得 Mod 既能主动操作数据，也能响应数据变化。
