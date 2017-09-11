package sessiondb

import (
	. "github.com/monofuel/badmars/server/go/util"
)

const (
	UNKNKOWN = iota
	BEARER
)


type Session struct {
	UUID	UUID	`json:"uuid"`
	User	UUID `json:"user"`
	Type int`json:"type"`
}