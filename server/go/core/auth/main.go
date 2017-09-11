package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	bmdb "github.com/monofuel/badmars/server/go/rethink"
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
