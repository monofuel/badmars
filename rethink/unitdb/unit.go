package unitdb

import (
	. "github.com/monofuel/badmars/util"
)

type Unit struct {
	UUID   UUID     `json:"uuid"`
	Type   UnitType `json:"type"`
	Map    string   `json:"map"`
	ChunkX int      `json:"chunkX"`
	ChunkY int      `json:"chunkY"`
	X      int      `json:"x"`
	Y      int      `json:"y"`
	//TODO rest of the stuff
}

type UnitMap map[UUID]Unit
