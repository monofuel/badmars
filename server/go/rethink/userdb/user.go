package userdb

import (
	. "github.com/monofuel/badmars/server/go/util"
)

type User struct {
	UUID	UUID	`json:"uuid"`
	Name string `json:"name"`
	Color string `json:"color"` // deprecated
	APIKey string `json:"apiKey"` // deprecated

	Location string `json:"location"`
}