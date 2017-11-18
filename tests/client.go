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

func login(ws *websocket.Conn) error {
	loginRequest := make(map[string]interface{})
	loginRequest["type"] = "login"
	loginRequest["planet"] = "testmap"
	loginStr, err := json.Marshal(loginRequest)
	if err != nil {
		return err
	}
	_, err = ws.Write(loginStr)
	if err != nil {
		return err
	}
	loginResp := make(map[string]interface{})
	loginRespStr := make([]byte, 20480)
	n, err := ws.Read(loginRespStr)
	if err != nil {
		return err
	}
	err = json.Unmarshal(loginRespStr[:n], &loginResp)
	if err != nil {
		return err
	}
	if loginResp["type"] != "login" {
		return fmt.Errorf("invalid response for login: %s", loginResp["type"])
	}
	if loginResp["success"] != true {
		return fmt.Errorf("login not successful: %s", loginResp["reason"])
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
