package unitdb

import (
	"fmt"

	"github.com/monofuel/badmars/server/go/rethink"
	r "gopkg.in/dancannon/gorethink.v2"
)

/*
Between(0, tick, r.BetweenOpts{
	Index:      "lastTick",
	RightBound: "open",
}).
*/

func CountUnprocessed(tick int, planet string) (int, error) {
	cursor, err := r.DB("badmars").
		Table(fmt.Sprintf("%s_unit", planet)).
		GetAllByIndex("awake", true).
		Filter(func(row r.Term) r.Term {
			return row.Field("lastTick").Lt(tick)
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

func CountAwake(planet string) (int, error) {
	cursor, err := r.DB("badmars").
		Table(fmt.Sprintf("%s_unit", planet)).
		GetAllByIndex("awake", true).
		Count().
		Run(rethink.Sess)
	if err != nil {
		return 0, err
	}
	var count int
	cursor.One(&count)
	return count, nil
}

func CountAll(planet string) (int, error) {
	cursor, err := r.DB("badmars").
		Table(fmt.Sprintf("%s_unit", planet)).
		Count().
		Run(rethink.Sess)
	if err != nil {
		return 0, err
	}
	var count int
	cursor.One(&count)
	return count, nil
}

func GetUnprocessedUnitIds(tick int, planet string) (*[]string, error) {

	//TODO set up with limit
	cursor, err := r.DB("badmars").
		Table(fmt.Sprintf("%s_unit", planet)).
		GetAllByIndex("awake", true).
		Filter(func(row r.Term) r.Term {
			return row.Field("lastTick").Lt(tick)
		}).
		Field("uuid").
		Run(rethink.Sess)
	if err != nil {
		return nil, err
	}
	var results []string
	cursor.All(&results)
	return &results, nil
}
