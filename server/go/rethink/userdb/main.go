package userdb

import (
	"github.com/google/uuid"
	"github.com/monofuel/badmars/server/go/rethink"
	. "github.com/monofuel/badmars/server/go/util"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
	r "gopkg.in/dancannon/gorethink.v2"
)

func table() r.Term {
	return r.DB("badmars").Table("user")
}

func GetByUUID(uuid UUID) (*User, error) {
	var cursor *r.Cursor
	var err error

	cursor, err = table().Get(uuid).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch user")
	}
	var user User
	err = cursor.One(&user)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get user from cursor")
	}

	return &user, nil
}

func Login(email string, password string) (*User, error) {
	var err error
	var cursor *r.Cursor

	cursor, err = table().GetAllByIndex("email", email).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch user")
	}
	var users []User
	err = cursor.All(&users)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get users from cursor")
	}
	if len(users) < 1 {
		return nil, errors.New("user not found " + email)
	} else if len(users) > 1 {
		return nil, errors.New("bad database state, duplicate emails")
	}
	user := users[0]

	err = bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(password))
	if err != nil {
		return nil, errors.Wrap(err, "invalid password")
	} else {
		return &user, nil
	}
}

func GetByUsername(username string) (*User, error) {
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

func Create(username string, email string, password string) (*User, error) {
	var err error
	var user User
	user.UUID = UUID(uuid.New().String())
	user.Name = username
	user.Email = email

	passwordHash, err := bcrypt.GenerateFromPassword(append([]byte(password)), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "failed to hash password")
	}

	user.PasswordHash = passwordHash

	_, err = table().Insert(
		&user,
		r.InsertOpts{
			Conflict:      "error",
			ReturnChanges: true,
		},
	).Run(rethink.Sess)

	if err != nil {
		return nil, errors.Wrap(err, "failed to insert new user")
	}

	return &user, nil
}
