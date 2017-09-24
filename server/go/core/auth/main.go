package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	bmdb "github.com/monofuel/badmars/server/go/rethink"
	"github.com/monofuel/badmars/server/go/rethink/sessiondb"
	"github.com/monofuel/badmars/server/go/rethink/userdb"
	. "github.com/monofuel/badmars/server/go/util"
)

var authPort = os.Getenv("BM_AUTH_PORT")
var templates = template.Must(template.ParseFiles("public/dashboard/index.html"))

func init() {
	fmt.Println("handling configuration")

	if authPort == "" {
		authPort = ":3004"
	}
	err := bmdb.Connect()
	if err != nil {
		log.Fatalln(err)
	}
	bmdb.Prepare()
}

func main() {
	fmt.Println("starting auth")

	registerHandlers()
	log.Printf("listening on port %s", authPort)
	log.Fatal(http.ListenAndServe(authPort, nil))
}

func registerHandlers() {

	r := mux.NewRouter()

	r.Methods("GET").Path("/").Handler(AppHandler(rootHandler))
	r.Methods("POST").Path("/auth/register").Handler(AppHandler(registerHandler))
	r.Methods("GET").Path("/auth/self").Handler(AppHandler(selfHandler))
	jsFs := http.FileServer(http.Dir("public/dashboard/js"))
	cssFs := http.FileServer(http.Dir("public/dashboard/css"))
	r.Methods("GET").PathPrefix("/js/").Handler(http.StripPrefix("/js", jsFs))
	r.Methods("GET").PathPrefix("/css/").Handler(http.StripPrefix("/css", cssFs))

	http.Handle("/", handlers.CombinedLoggingHandler(os.Stderr, r))
}

func rootHandler(w http.ResponseWriter, r *http.Request) *AppError {

	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		return &AppError{err, "failed to load index.html", 500}
	}
	return nil
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func registerHandler(w http.ResponseWriter, r *http.Request) *AppError {
	var register registerRequest
	err := json.NewDecoder(r.Body).Decode(&register)
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to parse json",
			Code:    400,
		}
	}

	user, err := userdb.Create(register.Username, register.Email, register.Password)
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to create user",
			Code:    500,
		}
	}

	session, err := sessiondb.CreateBearer(user.UUID)
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to create session",
			Code:    500,
		}
	}

	type registerResp struct {
		SessionToken string `json:"sessionToken"`
	}
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(&registerResp{
		SessionToken: session.Token,
	})

	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to encode register response",
			Code:    500,
		}
	}
	return nil
}

type selfResponse struct {
	UUID     UUID   `json:"uuid"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

func selfHandler(w http.ResponseWriter, r *http.Request) *AppError {
	user, err := authUser(r)
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to authorize",
			Code:    400,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(&selfResponse{
		UUID:     user.UUID,
		Username: user.Name,
		Email:    user.Email,
	})

	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to encode response",
			Code:    500,
		}
	}
	return nil
}

func authUser(r *http.Request) (*userdb.User, error) {
	bearer := r.Header.Get("Authorization")
	if bearer == "" {
		return nil, fmt.Errorf("missing Authorization header")
	}

	split := strings.Split(bearer, " ")
	if len(split) != 2 {
		return nil, fmt.Errorf("missing bearer token")
	}
	token := UUID(split[1])
	return sessiondb.GetBearerUser(token)
}

// mailgun
// curl -s --user "api:${MAILGUN_KEY}" "https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages" -F from="Excited User <excited@${MAILGUN_DOMAIN}>" -F to='monofuel@japura.net' -F subject='Hello' -F text='Testing some Mailgun awesomeness!'
