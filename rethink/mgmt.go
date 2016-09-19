package rethink

import (
	"errors"
	"fmt"

	. "github.com/monofuel/badmars/util"
	r "gopkg.in/dancannon/gorethink.v2"
)

func setupMgmtTable(tableList []string, Sess *BMDB) error {

	if !Contains(tableList, "mgmt") {
		fmt.Println("creating mgmt table")
		result, err := r.DB("badmars").TableCreate("mgmt").RunWrite(Sess)
		if err != nil {
			return err
		}
		if result.TablesCreated != 1 {
			fmt.Println(result)
			return errors.New("failed to create mgmt table")
		}
	}
	return nil
}
