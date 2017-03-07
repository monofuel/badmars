package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	bmdb "github.com/monofuel/badmars/server/go/rethink"
	bmError "github.com/monofuel/badmars/server/go/rethink/error"
	"github.com/monofuel/badmars/server/go/rethink/event"
	. "github.com/monofuel/badmars/server/go/util"
)

var dashboardPort = os.Getenv("DASHBOARD_PORT")
var templates = template.Must(template.ParseFiles("public/dashboard/index.html"))

func init() {
	fmt.Println("handling configuration")
	if dashboardPort == "" {
		dashboardPort = "8090"
	}
	err := bmdb.Connect()
	if err != nil {
		log.Fatalln(err)
	}
	bmdb.Prepare()
}

func main() {
	fmt.Println("starting dashboard")

	registerHandlers()
	log.Printf("listening on port %s", dashboardPort)
	log.Fatal(http.ListenAndServe(":"+dashboardPort, nil))
}

func registerHandlers() {

	r := mux.NewRouter()

	r.Methods("GET").Path("/").Handler(AppHandler(rootHandler))
	r.Methods("GET").Path("/serverErrors").Handler(AppHandler(serverErrorHandler))
	r.Methods("GET").Path("/serverProfiler").Handler(AppHandler(profileHandler))
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

func serverErrorHandler(w http.ResponseWriter, r *http.Request) *AppError {
	errors, err := bmError.ServerErrors(15)
	if err != nil {
		return &AppError{err, "failed to fetch errors", 500}
	}

	js, err := json.Marshal(errors)
	if err != nil {
		return &AppError{err, "failed to marshal json", 500}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)

	return nil
}

func profileHandler(w http.ResponseWriter, r *http.Request) *AppError {
	var cutoff = int(NowTimestamp() - (1000 * 60 * 60 * 24))
	var err error

	module := r.URL.Query().Get("module")

	stat := r.URL.Query().Get("stat")
	if stat == "" {
		return &AppError{nil, "specify a stat to fetch", 400}
	}

	cutoffParam := r.URL.Query().Get("cutoff")
	if cutoffParam != "" {
		if cutoff, err = strconv.Atoi(cutoffParam); err != nil {
			return &AppError{err, "could not parse cutoff", 400}
		}
	}
	metric := r.URL.Query().Get("metric")
	if metric == "" {
		return &AppError{nil, "specify a metric", 400}
	}
	if !Contains([]string{"avg", "executions", "sum"}, metric) {
		return &AppError{nil, "specify valid metric", 400}
	}

	cursor, err := event.FetchServerEvents(cutoff)
	if err != nil {
		return &AppError{err, "failed to fetch events", 500}
	}

	results := make([]DataPoint, 0)

	var event map[string]interface{}
	for cursor.Next(&event) {
		if event["module"] == "" {
			fmt.Println("found event with no module name")
			continue
		}
		if module != "" && event["module"] != module {
			continue
		}

		for k, v := range event {
			split := strings.Split(k, "-")
			if len(split) != 2 {
				continue
			}
			if split[0] != metric {
				continue
			}
			if split[1] != stat {
				continue
			}
			var point DataPoint
			var time float64
			var value float64
			var moduleName string
			var ok bool
			if time, ok = event["timestamp"].(float64); !ok {
				fmt.Println("failed to parse time")
				continue
			}
			if value, ok = v.(float64); !ok {
				fmt.Println("failed to parse value")
				continue
			}
			if moduleName, ok = event["module"].(string); !ok {
				fmt.Println("failed to parse module name")
				continue
			}
			point.Timestamp = time
			point.Value = value
			point.Module = moduleName
			results = append(results, point)
		}

	}

	js, err := json.Marshal(results)
	if err != nil {
		return &AppError{err, "failed to marshal json", 500}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)

	return nil
}
