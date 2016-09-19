package unit

import (
	"github.com/monofuel/badmars/rethink"
	r "gopkg.in/dancannon/gorethink.v2"
)

func CountUnprocessed(tick int) (int, error) {
	cursor, err := r.DB("badmars").
		Table("map").
		GetAllByIndex(true, "awake").
		Between(0, tick, r.BetweenOpts{
			Index:      "lastTick",
			RightBound: "open",
		}).
		Count().
		Run(rethink.Sess)
	if err != nil {
		return 0, err
	}
	var count int
	cursor.One(&count)
	return count, nil
}

func CountAwake() (int, error) {
	return 0, nil
}

func CountAll() (int, error) {
	return 0, nil
}
