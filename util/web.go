package util

import (
	"log"
	"net/http"
)

type AppHandler func(http.ResponseWriter, *http.Request) *AppError

type AppError struct {
	Error   error
	Message string
	Code    int
}

type DataPoint struct {
	Timestamp float64 `json:"timestamp"`
	Value     float64 `json:"value"`
	Module    string  `json:"module"`
}

func (fn AppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if e := fn(w, r); e != nil {
		log.Printf("%v", e.Error)
		http.Error(w, e.Message, e.Code)
	}
}
