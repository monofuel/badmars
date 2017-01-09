package error

import (
	"fmt"

	"github.com/monofuel/badmars/server/go/rethink"
	r "gopkg.in/dancannon/gorethink.v2"
)

//FetchServerErrors will fetch all of the server errors in the events table
func ServerErrors(limit int) ([]ErrorDoc, error) {
	fmt.Println("Fetching errors")

	cursor, err := r.DB("badmars").
		Table("event").
		GetAllByIndex("name", "server_error").
		OrderBy(r.Desc("timestamp")).
		Limit(limit).
		Run(rethink.Sess)
	if err != nil {
		return nil, err
	}
	var results []ErrorDoc
	err = cursor.All(&results)
	defer cursor.Close()
	return results, err
}
