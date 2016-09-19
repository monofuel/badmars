package main

import (
	"fmt"
	"log"
	"time"

	bmdb "github.com/monofuel/badmars/rethink"
	"github.com/monofuel/badmars/rethink/planet"
)

func init() {
	err := bmdb.Connect()
	if err != nil {
		log.Fatalln(err)
	}
}

func main() {
	fmt.Println("starting simulation service")
	planets, err := planet.ListMapNames()
	if err != nil {
		log.Fatal(err)
	}
	for _, planet := range planets {
		go func(planet string) {
			for {
				tryNewTick(planet)
			}
		}(planet)
	}
	c := make(chan int)
	<-c
}

func tryNewTick(name string) {
	fmt.Printf("simulating %s\n", name)
	//get the map

	//get unprocessed units
	//fire off unprocessed units to AI module
	//sleep until next tick

	time.Sleep(100 * time.Millisecond)
}
