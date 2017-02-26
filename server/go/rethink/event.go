package rethink

import (
	"errors"
	"fmt"

	. "github.com/monofuel/badmars/server/go/util"
	r "gopkg.in/dancannon/gorethink.v2"
)

func setupEventTable(tableList []string, Sess *BMDB) error {

	if !Contains(tableList, "event") {
		fmt.Println("creating event table")
		result, err := r.DB("badmars").TableCreate("event").RunWrite(Sess)
		if err != nil {
			return err
		}
		if result.TablesCreated != 1 {
			fmt.Println(result)
			return errors.New("failed to create event table")
		}
	}
	var indexList []string
	res, err := r.DB("badmars").Table("event").IndexList().Run(Sess)
	if err != nil {
		return err
	}
	err = res.All(&indexList)
	if err != nil {
		return err
	}
	if !Contains(indexList, "timestamp") {
		fmt.Println("adding index timestamp")
		result, err := r.DB("badmars").Table("event").IndexCreate("timestamp").RunWrite(Sess)
		if err != nil {
			return err
		}
		if result.Created != 1 {
			fmt.Println(result)
			return errors.New("failed to create timestamp index")
		}
	}

	if !Contains(indexList, "name") {
		fmt.Println("adding index name")
		result, err := r.DB("badmars").Table("event").IndexCreate("name").RunWrite(Sess)
		if err != nil {
			return err
		}
		if result.Created != 1 {
			fmt.Println(result)
			return errors.New("failed to create name index")
		}
	}

	r.DB("badmars").Table("event").IndexWait().Exec(Sess)

	return nil
}
