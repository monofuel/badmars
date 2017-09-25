type UUID = string;
type TileHash = string;
type ChunkHash = string;
type Timestamp = number;
type Tick = number;
type UnitType = string;
type TileCode = 0 | 1 | 2 | 3;
type TileType = 'land' | 'cliff' | 'water' | 'coast' | 'unknown';
type Dir = Symbol;
type ProfileKey = string;
type MovementLayer = 'ground' | 'air' | 'water';
type Resource = 'iron' | 'fuel';

type Success = boolean;

type ModuleName = 'chunk';

type ChunkProto = {
	grid: Array<Object>;
	navGrid: Array<Object>;
}

/*
type NetHandler = (ctx: Context, client: Client, data: Object) => Promise<void>;
type UnitMap = {
	[key: string]: Unit
}
*/

type FactoryOrder = {
	type: UnitType,
	cost: number,
	remaining: number
}

declare interface Init {
	init(): Promise<void>;
}

declare interface MonoDoc {
	validateSync(): boolean;
	validateAsync(): Promise<boolean>;
	refresh(): Promise<void>;
}

declare interface Entity extends MonoDoc {
	clone(): Entity;
}
