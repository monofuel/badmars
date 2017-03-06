package unitdb

import (
	. "github.com/monofuel/badmars/server/go/util"
)

type Detail struct {
	Type UnitType `json:"type"`
	tick int      `json:"tick"`
}

type Location struct {
	Map    string `json:"map"`
	ChunkX int    `json:"chunkX"`
	ChunkY int    `json:"chunkY"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

type Unit struct {
	UUID     UUID     `json:"uuid"`
	Awake    bool     `json:"awake"`
	Detail   Detail   `json:"detail"`
	Location Location `json:"location"`
	//TODO rest of the stuff
}

type UnitMap map[UUID]Unit
