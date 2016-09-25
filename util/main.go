package util

import "time"

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

func NowTimestamp() int64 {
	return time.Now().UnixNano() / (int64(time.Millisecond) / int64(time.Nanosecond))
}
