package planetdb

type Planet struct {
	Name              string         `json:"name"`
	Settings          PlanetSettings `json:"settings"`
	LastTickTimestamp int64          `json:"lastTickTimestamp"`
	LastTick          int            `json:"lastTick"`
	Users             []string       `json:"users"`
	Seed              float32        `json:"seed"`
	Paused            bool           `json:"paused"`
}

type PlanetSettings struct {
	ChunkSize   int     `json:"chunkSize"`
	WaterHeight float32 `json:"waterHeight"`
	CliffDelta  float32 `json:"cliffDelta"`
	Water       bool    `json:"water"`
	BigNoise    float32 `json:"bigNoise"`
	MedNoise    float32 `json:"medNoise"`
	SmallNoise  float32 `json:"smallNoise"`
	BigScale    float32 `json:"bigScale"`
	MedScale    float32 `json:"medScale"`
	SmallScale  float32 `json:"smallScale"`
	IronChance  float32 `json:"ironChance"`
	OilChance   float32 `json:"oilChance"`
}
