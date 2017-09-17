package sessiondb

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/monofuel/badmars/server/go/rethink"
	"github.com/monofuel/badmars/server/go/rethink/userdb"
	. "github.com/monofuel/badmars/server/go/util"
	"github.com/pkg/errors"
	r "gopkg.in/dancannon/gorethink.v2"
)

func table() r.Term {
	return r.DB("badmars").Table("session")
}

func CreateBearer(userUUID UUID) (*Session, error) {
	if userUUID == "" {
		return nil, fmt.Errorf("blank user uuid provided")
	}
	var err error

	session := &Session{
		Token: randomString(60),
		User:  userUUID,
		Type:  BEARER,
	}

	_, err = table().Insert(
		&session,
		r.InsertOpts{
			Conflict:      "error",
			ReturnChanges: true,
		},
	).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to insert new session")
	}

	return session, nil
}

func GetBearerUser(token UUID) (*userdb.User, error) {
	var cursor *r.Cursor
	var err error
	fmt.Println(token)
	cursor, err = table().Get(token).Run(rethink.Sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to find token")
	}

	var sess Session
	err = cursor.One(&sess)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get session")
	}

	user, err := userdb.GetByUUID(sess.User)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get user for session")
	}

	return user, nil
}

func randomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	str := base64.StdEncoding.EncodeToString(b)
	str = strings.Replace(str, "/", "-", -1)
	str = strings.Replace(str, "+", "_", -1)
	return str
}
