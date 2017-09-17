package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	bmdb "github.com/monofuel/badmars/server/go/rethink"
	"github.com/monofuel/badmars/server/go/rethink/userdb"
	. "github.com/monofuel/badmars/server/go/util"
)

var authPort = os.Getenv("BM_AUTH_PORT")
var templates = template.Must(template.ParseFiles("public/dashboard/index.html"))

var sessionTokenHtml = `
<html>
<head>
	<meta content="text/html; charset=utf-8"/>
	<title>Success</title>
	<script type="text/javascript">
		try {
			const token = '{{ .SessionToken }}';
			console.log('setting session token: ' + token);
			window.sessionStorage.setItem("auth-token", token);
		} finally {
			// window.location = '/badmars';
		}
	</script>
</head>
<body>
	<p>Redirecting...</p>
</body>
</html>
`

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

type loginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func registerHandler(w http.ResponseWriter, r *http.Request) *AppError {
	var login loginRequest
	err := json.NewDecoder(r.Body).Decode(&login)
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to parse json",
			Code:    400,
		}
	}

	userdb.Create(&userdb.User{})

	// TODO create session and pass it back
	type sessionParams struct {
		SessionToken string
	}
	t := template.New("Registration")
	t = template.Must(t.Parse(sessionTokenHtml))

	err = t.ExecuteTemplate(w, "Registration", &sessionParams{
		SessionToken: "foobar",
	})
	if err != nil {
		return &AppError{
			Error:   err,
			Message: "failed to generate registration redirect",
			Code:    500,
		}
	}
	return nil
}

func selfHandler(w http.ResponseWriter, r *http.Request) *AppError {
	return &AppError{
		Error:   nil,
		Message: "not implemented",
		Code:    500,
	}
}
