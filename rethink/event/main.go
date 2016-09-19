package db

import (
	"fmt"

	r "gopkg.in/dancannon/gorethink.v2"
)

func (sess *BMDB) fetchServerEvents(cutoff int) (*r.Cursor, error) {
	fmt.Println("Fetching events")
	cursor, err := r.DB("badmars").
		Table("event").
		GetAllByIndex("name", "server_stats").
		OrderBy(r.Desc("timestamp")).
		Filter(r.Row.Field("timestamp").Gt(cutoff)).
		Run(sess)
	if err != nil {
		return nil, err
	}

	return cursor, nil
}
