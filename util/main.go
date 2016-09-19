package util

type UUID string
type TileHash string
type ChunkHash string
type Timestamp int
type Tick int
type UnitType string
type Success bool

func Contains(list []string, item string) bool {
	for _, elem := range list {
		if elem == item {
			return true
		}
	}
	return false
}
