package planetdb

import (
	"github.com/monofuel/badmars/server/go/rethink"
	. "github.com/monofuel/badmars/server/go/util"
	r "gopkg.in/dancannon/gorethink.v2"
)

func ListNames() ([]string, error) {
	cursor, err := r.DB("badmars").
		Table("map").
		Field("name").
		CoerceTo("array").
		Run(rethink.Sess)
	if err != nil {
		return nil, err
	}
	var result []string
	err = cursor.All(&result)
	return result, err
}

func Get(name string) (*Planet, error) {
	result := new(Planet)
	cursor, err := r.DB("badmars").
		Table("map").Get(name).Run(rethink.Sess)
	if err != nil {
		return nil, err
	}
	err = cursor.One(result)

	return result, err
}

func (planet *Planet) AdvanceTick() error {
	patch := make(map[string]interface{})
	planet.LastTickTimestamp = NowTimestamp()
	patch["lastTickTimestamp"] = planet.LastTickTimestamp
	planet.LastTick = planet.LastTick + 1
	patch["lastTick"] = planet.LastTick
	return planet.patch(&patch)
}

func (planet *Planet) AdvancePaused() error {
	patch := make(map[string]interface{})
	planet.LastTickTimestamp = NowTimestamp()
	patch["lastTickTimestamp"] = planet.LastTickTimestamp
	return planet.patch(&patch)
}

func (planet *Planet) patch(patch *map[string]interface{}) error {

	_, err := r.DB("badmars").
		Table("map").
		Get(planet.Name).
		Update(patch).
		RunWrite(rethink.Sess)

	return err
}
