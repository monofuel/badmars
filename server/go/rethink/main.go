package rethink

import (
	"fmt"
	"log"
	"os"

	. "github.com/monofuel/badmars/server/go/util"
	r "gopkg.in/dancannon/gorethink.v2"
)

type BMDB struct {
	r.Session
}

var rethinkHost = os.Getenv("BADMARS_DB")
var Sess *BMDB

func init() {
	if rethinkHost == "" {
		rethinkHost = "localhost"
	}
	r.SetTags("gorethink", "json")
}

func Connect() error {
	fmt.Printf("connecting to db: %s\n", rethinkHost)
	Session, err := r.Connect(r.ConnectOpts{Address: rethinkHost, Database: "badmars"})
	if err != nil {
		return err
	}
	Sess = &BMDB{*Session}
	return nil
}

func Prepare() error {
	if Sess == nil {
		log.Fatalln("not connected to db")
	}
	var dbList []string
	var tableList []string

	res, err := r.DBList().Run(Sess)
	if err != nil {
		return err
	}
	if err := res.All(&dbList); err != nil {
		return err
	}
	if !Contains(dbList, "badmars") {
		fmt.Println("creating database")
		if _, err := r.DBCreate("badmars").Run(Sess); err != nil {
			return err
		}
	}

	res, err = r.DB("badmars").TableList().Run(Sess)
	if err != nil {
		return err
	}

	if err := res.All(&tableList); err != nil {
		return err
	}

	err = setupEventTable(tableList, Sess)
	if err != nil {
		return err
	}

	err = setupMgmtTable(tableList, Sess)
	if err != nil {
		return err
	}

	return nil
}
