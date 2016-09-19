package planet

import (
	"github.com/monofuel/badmars/rethink"
	r "gopkg.in/dancannon/gorethink.v2"
)

func ListMapNames() ([]string, error) {
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
	if err != nil {
		return nil, err
	}
	return result, nil
}

func getMap() {

}
