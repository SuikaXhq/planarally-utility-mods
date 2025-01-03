import { type Component, type DeepReadonly, type UnwrapNestedRefs } from "vue";

export interface Tracker {
    uuid: string;
    visible: boolean;
    name: string;
    value: number;
    maxvalue: number;
    draw: boolean;
    primaryColor: string;
    secondaryColor: string;
}
export type UiTracker = { shape: number; temporary: boolean } & Tracker;

export interface Sync {
    ui: boolean;
    server: boolean;
}

interface IShape {
    id: number;
    character: number | undefined;
    invalidate: (skipLightUpdate: boolean) => void;
}

interface TrackerSystem {
    get(
        id: number,
        trackerId: string,
        includeParent: boolean
    ): DeepReadonly<Tracker> | undefined;
    getOrCreate(
        id: number,
        trackerId: string,
        sync: Sync,
        initialData?: () => Partial<Tracker>
    ): { tracker: DeepReadonly<Tracker>; created: boolean };
    remove(id: number, trackerId: string, syncTo: Sync): void;
    update(
        id: number,
        trackerId: string,
        delta: Partial<Tracker>,
        syncTo: Sync
    ): void;
}

interface ApiCharacter {
    id: number;
    shapeId: string;
}

interface CharacterSystem {
    getAllCharacters(): IterableIterator<DeepReadonly<ApiCharacter>>;
    getShape(characterId: number): IShape | undefined;
}

interface ReactiveState<T extends object, W extends string = ""> {
    raw: DeepReadonly<Omit<T, W>>;
    reactive: DeepReadonly<UnwrapNestedRefs<T>>;
    mutableReactive: UnwrapNestedRefs<T>;
}

interface NonReactiveState<U> {
    readonly: DeepReadonly<U>;
    mutable: U;
}

interface SystemsState {
    characters: ReactiveState<{
        activeCharacterId: number | undefined;
        characterIds: Set<number>;
    }> &
        NonReactiveState<{ characters: Map<number, ApiCharacter> }>;
    game: ReactiveState<{
        roomName: string;
        roomCreator: string;
    }>;
    selected: ReactiveState<{
        focus: number | undefined;
        selected: Set<number>;
    }>;
}

type DBR = Record<string, unknown>;

export interface DataBlock<D extends DBR> {
    get existsOnServer(): boolean;
    get<K extends keyof D>(key: K): D[K];
    set<K extends keyof D>(key: K, vDlue: D[K], persist: boolean): void;
    listen<K extends keyof D>(
        source: string,
        key: K,
        cb: (value: D[K]) => void
    ): void;
    save(): void;
    createOnServer(): Promise<boolean>;
    saveOrCreate(): Promise<void>;
}

export interface DataBlockSerializer<T extends DBR, Y extends DBR = T> {
    serialize?: { [key in keyof T & keyof Y]?: (data: T[key]) => Y[key] };
    deserialize?: { [key in keyof T & keyof Y]?: (data: Y[key]) => T[key] };
}

export interface ApiCoreDataBlock {
    source: string;
    name: string;
    category: "room" | "shape" | "user";
    data: string;
}
export interface ApiRoomDataBlock extends ApiCoreDataBlock {
    category: "room";
}
export interface ApiShapeDataBlock extends ApiCoreDataBlock {
    category: "shape";
    shape: string;
}
export interface ApiUserDataBlock extends ApiCoreDataBlock {
    category: "user";
}
export type ApiDataBlock =
    | ApiRoomDataBlock
    | ApiShapeDataBlock
    | ApiUserDataBlock;
export type DistributiveOmit<T, K extends keyof any> = T extends any
    ? Omit<T, K>
    : never;
export type DbRepr = DistributiveOmit<ApiDataBlock, "data">;

export interface GameApi {
    systems: { characters: CharacterSystem; trackers: TrackerSystem };
    systemsState: SystemsState;

    ui: {
        shape: {
            registerTab: (
                component: Component,
                name: string,
                filter?: (shape: number) => boolean
            ) => void;
            registerTrackerSettings: (
                component: Component,
                name: string,
                filter?: (shape: number, trackerId: string) => boolean
            ) => void;
        };
    };

    getShape: (shape: number) => IShape;
    getGlobalId: (id: number) => string | undefined;

    getOrLoadDataBlock: <D extends DBR, S extends DBR = D>(
        repr: DistributiveOmit<DbRepr, "source">,
        serializer: DataBlockSerializer<D, S>,
        options?: { createOnServer?: boolean; defaultData?: () => D }
    ) => Promise<DataBlock<D> | undefined>;
    loadDataBlock: <D extends DBR, S extends DBR = D>(
        repr: DistributiveOmit<DbRepr, "source">,
        serializer: DataBlockSerializer<D, S>,
        options?: { createOnServer?: boolean; defaultData?: () => D }
    ) => Promise<DataBlock<D> | undefined>;
    createDataBlock: <D extends DBR, S extends DBR = D>(
        repr: DistributiveOmit<DbRepr, "source">,
        data: D,
        serializer: DataBlockSerializer<D, S>,
        options?: { createOnServer?: boolean }
    ) => Promise<DataBlock<D>>;
    getDataBlock: <D extends DBR>(repr: DbRepr) => DataBlock<D> | undefined;
}

export function haha(): void {}
