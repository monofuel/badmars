package event

import (
	"fmt"

	"github.com/monofuel/badmars/server/go/rethink"
	r "gopkg.in/dancannon/gorethink.v2"
)

func FetchServerEvents(cutoff int) (*r.Cursor, error) {
	fmt.Println("Fetching events")
	cursor, err := r.DB("badmars").
		Table("event").
		GetAllByIndex("name", "server_stats").
		OrderBy(r.Desc("timestamp")).
		Filter(r.Row.Field("timestamp").Gt(cutoff)).
		Run(rethink.Sess)
	if err != nil {
		return nil, err
	}

	return cursor, nil
}
