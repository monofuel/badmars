package main

import (
	"io"
	"os"
	"os/exec"
	"testing"
)

var testUser string = "testUser"
var mapName string = "secunda"

func TestCreateMap(t *testing.T) {
	err := Commander([]string{"createmap", mapName})
	if err != nil {
		t.Error(err)
	}
	err = verify()
	if err != nil {
		t.Error(err)
	}
}

func TestCreateUser(t *testing.T) {
	err := Commander([]string{"createuser", testUser, "4daa3dae8c0eb1c223a3e343446e6c54"})
	if err != nil {
		t.Error(err)
	}
	err = verify()
	if err != nil {
		t.Error(err)
	}
}

func TestUser(t *testing.T) {
	err := LoginTest()
	if err != nil {
		t.Error(err)
	}
	err = verify()
	if err != nil {
		t.Error(err)
	}
}

func TestRemoveUser(t *testing.T) {
	err := Commander([]string{"removeuser", testUser})
	if err != nil {
		t.Error(err)
	}
	err = verify()
	if err != nil {
		t.Error(err)
	}
}

func TestRemoveMap(t *testing.T) {
	err := Commander([]string{"removemap", mapName})
	if err != nil {
		t.Error(err)
	}
}

func verify() error {
	prog, err := exec.LookPath("node")
	if err != nil {
		return err
	}

	cmd := exec.Command(prog, "validator.js", mapName)
	cmd.Env = env
	cmd.Dir = "./server/"

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

	return cmd.Wait()
}

func LoginTest() error {
	prog, err := exec.LookPath("node")
	if err != nil {
		return err
	}

	cmd := exec.Command(prog, "testapi.js", mapName)
	cmd.Env = env
	cmd.Dir = "./server/"

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

	return cmd.Wait()
}

func Commander(args []string) error {
	prog, err := exec.LookPath("node")
	if err != nil {
		return err
	}
	args = append([]string{"commander.js"}, args...)

	cmd := exec.Command(prog, args...)
	cmd.Env = env
	cmd.Dir = "./server/"

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

	return cmd.Wait()
}
