package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/pkg/errors"
)

type BMClient struct {
	Hostname string

	http *http.Client
}

type User struct {
	UUID     string `json:"uuid"`
	Username string `json:"username"`
}

func NewClient(hostname string) *BMClient {
	return &BMClient{
		Hostname: hostname,
		http:     &http.Client{},
	}
}

func (c *BMClient) Register(username string, email string, password string) (*User, error) {
	type registerRequest struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	body, err := json.Marshal(&registerRequest{
		Username: username,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal registration request")
	}
	url := fmt.Sprintf("http://%s/auth/register", c.Hostname)
	resp, err := c.http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, errors.Wrap(err, "failed to post registration")
	}

	if resp.StatusCode != 200 {
		return nil, errors.New(fmt.Sprintf("bad registration response %v\n", resp))
	}

	fmt.Println("response")
	buff, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse response")
	}
	fmt.Println(buff)

	// match token in response
	// ^\s*const\s*token\s*=\s*\"(.*)\"\s*;$

	// TODO fetch self
	return nil, nil
}
