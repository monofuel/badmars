package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"

	bmdb "github.com/monofuel/badmars/server/go/rethink"
	"github.com/monofuel/badmars/server/go/rethink/planetdb"
	"github.com/monofuel/badmars/server/go/rethink/unitdb"
	"github.com/monofuel/badmars/server/go/services"
	. "github.com/monofuel/badmars/server/go/util"
)

var aiHost string
var aiPort string
var aiSvc services.AIClient

var tps int

var simulatedPlanets struct {
	sync.RWMutex
	Planets []string
}

func init() {
	err := bmdb.Connect()
	if err != nil {
		log.Fatalln(err)
	}
	aiHost = os.Getenv("AI_HOST")
	if aiHost == "" {
		aiHost = "localhost"
	}
	aiPort = os.Getenv("BM_AI_PORT")
	if aiPort == "" {
		aiPort = "3010"
	}
	tpsEnv := os.Getenv("TICKS_PER_SEC")
	if tpsEnv != "" {
		tps, err = strconv.Atoi(tpsEnv)
	} else {
		tps = 1
	}
}

func main() {
	grpcHost := fmt.Sprintf("%s:%s", aiHost, aiPort)
	conn, err := grpc.Dial(grpcHost, grpc.WithInsecure())
	if err != nil {
		log.Fatal(err)
	}
	aiSvc = services.NewAIClient(conn)
	defer conn.Close()

	fmt.Println("starting simulation service")
	/*
		planets, err := planetdb.ListNames()
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("simulating %d planets\n", len(planets))
		for _, planetName := range planets {
			go simulatePlanet(planetName)
		}
	*/
	go checkForPlanets()

	c := make(chan int)
	<-c
}

func checkForPlanets() {
	for {
		planets, err := planetdb.ListNames()
		if err != nil {
			log.Fatal(err)
		}
		simulatedPlanets.RLock()
		for _, planetName := range planets {
			if !Contains(simulatedPlanets.Planets, planetName) {
				fmt.Println("starting planet simulation: ", planetName)
				go simulatePlanet(planetName)
			}
		}
		simulatedPlanets.RUnlock()
		time.Sleep(2 * time.Second)
	}
}

func addPlanetToSimulated(name string) {
	simulatedPlanets.Lock()
	simulatedPlanets.Planets = append(simulatedPlanets.Planets, name)
	simulatedPlanets.Unlock()
}

func removePlanetFromSimulated(name string) {
	simulatedPlanets.Lock()
	defer simulatedPlanets.Unlock()
	for i, _ := range simulatedPlanets.Planets {
		if simulatedPlanets.Planets[i] == name {
			//each planet should only be listed once
			simulatedPlanets.Planets[i] = simulatedPlanets.Planets[len(simulatedPlanets.Planets)-1]
			simulatedPlanets.Planets[len(simulatedPlanets.Planets)-1] = ""
			simulatedPlanets.Planets = simulatedPlanets.Planets[:len(simulatedPlanets.Planets)-1]
			return
		}
	}
}
func simulatePlanet(name string) {
	addPlanetToSimulated(name)
	for {
		planet, err := planetdb.Get(name)
		if err != nil {
			fmt.Printf("planet deleted: %v\n", err)

			break
		}

		err = tryNewTick(planet)
		if err != nil {
			fmt.Printf("tick error: %v\n", err)
			//force a sleep and hope the error goes away?
			time.Sleep(5 * time.Second)
		}

		delta := NowTimestamp() - planet.LastTickTimestamp
		// fmt.Printf("delta ms: %d\n", delta)

		if delta < int64(1000/tps) {
			sleepTime := int64(1000/tps) - delta
			// fmt.Printf("tps: %d | sleeping for %d\n", tps, sleepTime)
			time.Sleep(time.Duration(sleepTime) * time.Millisecond)
		} else if delta > int64(1.5*1000/tps) {
			fmt.Printf("Long tick length, delta of %d\n", delta)
		}
	}
}

func tryNewTick(planet *planetdb.Planet) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(1000/tps)*time.Millisecond)
	defer cancel()
	/*
		uCount, err := unitdb.CountUnprocessed(planet.LastTick, planet.Name)
		if err != nil {
			return err
		}
		awakeCount, err := unitdb.CountAwake(planet.Name)
		if err != nil {
			return err
		}
		allCount, err := unitdb.CountAll(planet.Name)
		if err != nil {
			return err
		}
		fmt.Printf("%v:tick | %d | unprocessed/awake/all | (%d/%d/%d)\n", planet.Name, planet.LastTick, uCount, awakeCount, allCount)
	*/

	//get unprocessed units
	unprocessed, err := unitdb.GetUnprocessedUnitIds(planet.LastTick, planet.Name)
	if err != nil {
		return err
	}
	var wg sync.WaitGroup
	wg.Add(len(*unprocessed))
	successChan := make(chan (bool), len(*unprocessed))
	for _, uuid := range *unprocessed {
		//fire off unprocessed units to AI module
		go func(uuid string) {
			message := &services.Entity{
				uuid,
				planet.Name,
				int64(planet.LastTick),
			}
			success, err := aiSvc.ProcessUnit(ctx, message)
			if err != nil {
				if !strings.Contains(err.Error(), "connection is unavailable") {
					fmt.Printf("error processing unit: %v\n", err)
					successChan <- false
				}
			} else {
				successChan <- success.Success
			}
			wg.Done()
		}(uuid)
	}
	wg.Wait()
	successCount := 0
	failCount := 0
	for {
		done := false
		select {
		case success := <-successChan:
			if success {
				successCount++
			} else {
				failCount++
			}
		default:
			done = true
		}
		if done {
			break
		}
	}
	close(successChan)
	if failCount != 0 {
		fmt.Printf("unit update | paused: %v, success: %d,failed: %d\n", planet.Paused, successCount, failCount)
	}

	if planet.Paused {
		err = planet.AdvancePaused()
		if err != nil {
			return err
		}
	} else {
		err = planet.AdvanceTick()
		if err != nil {
			return err
		}
	}
	return nil
}
