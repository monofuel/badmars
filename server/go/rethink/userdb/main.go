package userdb

import (
	"github.com/monofuel/badmars/server/go/rethink"
	. "github.com/monofuel/badmars/server/go/util"
	"github.com/pkg/errors"
	r "gopkg.in/dancannon/gorethink.v2"
)

func table() r.Term {
	return r.DB("badmars").Table("User")
}

func Get(username string) (*User, error) {
	var cursor *r.Cursor
	var err error

	cursor, err = table().GetAllByIndex("username", username).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch user")
	}
	var users []User
	err = cursor.All(&users)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get users from cursor")
	}
	if len(users) < 1 {
		return nil, errors.New("user not found " + username)
	} else if len(users) > 1 {
		return nil, errors.New("bad database state, duplicate usernames")
	}
	return &users[0], nil
}

func Create(user User) (*User, error) {
	var cursor *r.Cursor
	var err error
	cursor, err = table().Insert(
		user,
		r.InsertOpts{
			Conflict:      "error",
			ReturnChanges: true,
		},
	).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to insert new user")
	}

	var created User
	err = cursor.One(&created)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get created user from cursor")
	}
	return &created, nil
}
