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

interface ChunkProto {
	grid: Array<Object>;
	navGrid: Array<Object>;
}

interface EntityMapType {
	[key: string]: UUID
}

interface FactoryOrder {
	uuid: UUID,
	factory: UUID,
	type: UnitType,
	created: number,
}
