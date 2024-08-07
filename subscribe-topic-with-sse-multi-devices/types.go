package main

type Message struct {
	Topic string `json:"topic" binding:"required"`
	Data  string `json:"data" binding:"required"`
}

type ClientChan chan Message

type Client struct {
	Device string
	Topics []string
	C      ClientChan
}
