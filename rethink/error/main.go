package db

import (
	"fmt"

	r "gopkg.in/dancannon/gorethink.v2"
)

//FetchServerErrors will fetch all of the server errors in the events table
func (sess *BMDB) fetchErrors(limit int) (*r.Cursor, error) {
	fmt.Println("Fetching errors")

	cursor, err := r.DB("badmars").
		Table("event").
		GetAllByIndex("name", "server_error").
		OrderBy(r.Desc("timestamp")).
		Limit(limit).
		Run(sess)
	if err != nil {
		return nil, err
	}

	return cursor, nil
}
