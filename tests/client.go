package main

import (
	"encoding/json"
	"fmt"

	"golang.org/x/net/websocket"
)

func spawnForTestmap(token string) error {

	ws, err := wsConnect(token)
	if err != nil {
		return err
	}

	err = login(ws)
	if err != nil {
		return err
	}
	return nil
}

type BMResp struct {
	Type    string `json:"type"`
	Success bool   `json:"success"`
	Reason  string `json:"reason"`
}

func login(ws *websocket.Conn) error {
	loginRequest := make(map[string]interface{})
	loginRequest["type"] = "login"
	loginRequest["planet"] = "testmap"
	loginStr, err := json.Marshal(loginRequest)
	if err != nil {
		return err
	}

	connected := &BMResp{}
	connectedResp := make([]byte, 20480)
	n, err := ws.Read(connectedResp)
	if err != nil {
		return err
	}
	err = json.Unmarshal(connectedResp[:n], connected)
	if err != nil {
		return err
	}
	if connected.Type != "connected" {
		return fmt.Errorf("invalid response for new connection: %s", connected.Type)
	}

	_, err = ws.Write(loginStr)
	if err != nil {
		return err
	}
	loginResp := &BMResp{}
	loginRespStr := make([]byte, 20480)
	n, err = ws.Read(loginRespStr)
	if err != nil {
		return err
	}
	err = json.Unmarshal(loginRespStr[:n], &loginResp)
	if err != nil {
		return err
	}
	if loginResp.Type != "login" {
		return fmt.Errorf("invalid response for login: %s", loginResp.Type)
	}
	if !loginResp.Success {
		return fmt.Errorf("login not successful: %s", loginResp.Reason)
	}
	return nil
}

func wsConnect(token string) (*websocket.Conn, error) {
	config, err := websocket.NewConfig("ws://localhost:7005/net?token="+token, "http://localhost")
	if err != nil {
		return nil, err
	}

	return websocket.DialConfig(config)
}
