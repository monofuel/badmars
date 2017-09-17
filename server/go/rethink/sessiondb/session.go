package sessiondb

import (
	. "github.com/monofuel/badmars/server/go/util"
)

const (
	UNKNKOWN = iota
	BEARER
)

type Session struct {
	Token string `json:"token"`
	User  UUID   `json:"user"`
	Type  int    `json:"type"`
}
