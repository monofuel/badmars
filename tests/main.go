package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
)

var hostname string

func init() {
	// wait for server to be running
	hostname = os.Getenv("BADMARS_SERVER")
	if hostname == "" {
		hostname = "localhost"
	}

	client := &http.Client{
		Timeout: 20 * time.Second,
	}
	var resp *http.Response
	var err error
	for i := 0; i < 10; i++ {

		resp, err = client.Get(fmt.Sprintf("http://%s", hostname))
		if err != nil {
			log.Println(err)
		}
		if resp != nil {
			log.Printf("server %s responded with %v\n", hostname, resp.StatusCode)
		}
		if err == nil && resp.StatusCode == 200 {
			break
		}
	}
	if err != nil {
		log.Fatal(err)
	}
	if resp.StatusCode != 200 {
		log.Fatalf("bad status code %v\n", resp.StatusCode)
	}

	fmt.Printf("server at %s is ready!\n", hostname)

}

func main() {
	fmt.Println("Starting Tests")

	client := NewClient(hostname)
	err := performRegistration(client)
	if err != nil {
		log.Fatal(err)
	}

}

func performRegistration(c *BMClient) error {
	fmt.Println("registering")
	username := uuid.New().String()
	email := "racha@japura.net"
	password := uuid.New().String()

	user, err := c.Register(username, email, password)
	if err != nil {
		return errors.Wrap(err, "failed to register")
	}
	if user.Username != username {
		return fmt.Errorf("Wrong username. expected %s, got %s", username, user.Username)
	}
	fmt.Println("Registered!")
	fmt.Printf("===\n%v\n===\n", user)
	return nil
}
