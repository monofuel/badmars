package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	bmdb "github.com/monofuel/badmars/rethink"
	. "github.com/monofuel/badmars/util"
)

var env []string

func init() {
	prepareEnv()
}

func main() {
	var err error
	fmt.Println("----------------------------------------")
	fmt.Println(GetRandomBanner())
	fmt.Println("----------------------------------------")

	//TODO watch subdirectories for changes
	//and only reload the modules that need changes

	if shouldRunRethink() {
		err = startProgram("rethinkdb", "./")
		if err != nil {
			log.Fatalln(err)
		}
		time.Sleep(1000 * time.Millisecond)
	}
	err = killExistingProcesses()
	if err != nil {
		log.Fatalln(err)
	}

	err = bmdb.Connect()
	if err != nil {
		log.Fatalln(err)
	}
	err = bmdb.Prepare()
	if err != nil {
		log.Fatalln(err)
	}
	time.Sleep(5 * time.Second)
	err = startNodeModule("chunk")
	if err != nil {
		log.Fatalln(err)
	}
	err = startGoModule("dashboard")
	if err != nil {
		log.Fatalln(err)
	}
	time.Sleep(1 * time.Second)
	err = startNodeModule("web")
	if err != nil {
		log.Fatalln(err)
	}
	err = startNodeModule("net")
	if err != nil {
		log.Fatalln(err)
	}
	err = startNodeModule("ai")
	if err != nil {
		log.Fatalln(err)
	}
	time.Sleep(1 * time.Second)
	err = startNodeModule("pathfinder")
	if err != nil {
		log.Fatalln(err)
	}
	err = startGoModule("simulate")
	if err != nil {
		log.Fatalln(err)
	}
	c := make(chan int)
	<-c
}

func prepareEnv() {

	defaultEnv("BADMARS_DB", "localhost")
	defaultEnv("AI_HOST", "localhost")
	defaultEnv("MAP_HOST", "localhost")
	defaultEnv("BADMARS_WS_SERVER", "ws://localhost")
	defaultEnv("BADMARS_WS_PUBLIC_PORT", "7005")
}

func defaultEnv(key string, defaultValue string) {
	val := os.Getenv(key)
	if val == "" {
		val = defaultValue
	}
	env = append(env, fmt.Sprintf("%s=%s", key, val))
}

func startNodeModule(name string) error {
	return startProgram("node", "./server/", name)
}

func startGoModule(name string) error {
	err := buildGoModule(name, fmt.Sprintf("./core/%s/%s.go", name, name))
	if err != nil {
		return err
	}
	return startProgram(fmt.Sprintf("./%s", name), "./")
}

func buildGoModule(name string, source string) error {
	fmt.Printf("building %s\n", name)
	cmd := exec.Command("go", "build", source)
	err := cmd.Start()
	if err != nil {
		return err
	}
	return cmd.Wait()
}

func startProgram(name string, path string, args ...string) error {
	fmt.Printf("starting %s", name)
	if len(args) > 0 {
		fmt.Printf(" with args %v\n", args)
	} else {
		fmt.Println()
	}
	prog, err := exec.LookPath(name)
	if err != nil {
		return err
	}

	cmd := exec.Command(prog, args...)
	cmd.Env = env
	cmd.Dir = path

	cmdOut, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmdErr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	err = cmd.Start()
	if err != nil {
		return err
	}

	go io.Copy(os.Stdout, cmdOut)
	go io.Copy(os.Stderr, cmdErr)

	go func() {
		err := cmd.Wait()
		if err != nil {
			fmt.Printf("module %s crashed with result %v, restarting\n", name, err)
			time.Sleep(5 * time.Second)
		}
		startProgram(name, path, args...)
	}()

	return nil
}

func shouldRunRethink() bool {
	envVal := os.Getenv("BADMARS_DB")
	if envVal != "localhost" && envVal != "" {
		return false
	}
	fmt.Println("checking if rethinkdb is running...")
	cmd := exec.Command("bash", "-c", "ps aux | grep rethink | grep -v grep | wc -l")
	cmdOut, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatalln(err)
	}
	cmdErr, err := cmd.StderrPipe()
	if err != nil {
		log.Fatalln(err)
	}
	err = cmd.Start()

	if err != nil {
		log.Fatalln(err)
	}
	defer cmd.Wait()

	stdOutput, err := ioutil.ReadAll(cmdOut)
	if err != nil {
		fmt.Println("error reading stdout")
		log.Fatalln(err)
	}
	errOutput, err := ioutil.ReadAll(cmdErr)
	if err != nil {
		fmt.Println("error reading stderr")
		log.Fatalln(err)
	}
	if len(errOutput) > 0 {
		fmt.Println("bad output")
		log.Fatalln(errOutput)
	}

	processCount, err := strconv.Atoi(strings.TrimSpace(string(stdOutput)))
	if err != nil {
		log.Fatalln(err)
	}

	fmt.Printf("found %d rethink processes\n", processCount)

	return processCount == 0
}

//killExistingProcesses to make sure we don't have any stray processes around
func killExistingProcesses() error {
	fmt.Println("killing existing badmars node processes")
	modules := []string{"chunk", "ai", "web", "net", "pathfinder"}
	for _, module := range modules {
		greper := fmt.Sprintf("ps aux | grep -i 'node %s'  | awk '{print $2}' | xargs kill -9", module)
		cmd := exec.Command("bash", "-c", greper)
		err := cmd.Start()
		if err != nil {
			return err
		}
		cmd.Wait()
	}
	return nil
}
