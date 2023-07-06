package main

import "log"

type Event struct {
	Message chan Message

	// New client connections
	NewClients chan Client

	// Closed client connections
	ClosedClients chan Client

	// All client connections
	Clients map[string]ClientChan

	// 所有用户的订阅话题
	// 格式: map["huoyijie"]map["chatgpt"]true
	Subscribs map[string]map[string]bool
}

// 创建 Event 对象
func NewEvent() (event *Event) {
	event = &Event{
		Message:       make(chan Message),
		NewClients:    make(chan Client),
		ClosedClients: make(chan Client),
		Clients:       make(map[string]ClientChan),
		Subscribs:     make(map[string]map[string]bool),
	}
	go event.listen()
	return
}

// 只在单独一个协程内更新 Clients/Subscribs，避免并发读写 map
func (event *Event) listen() {
	for {
		select {
		// Add new available client
		case client := <-event.NewClients:
			event.Clients[client.User] = client.C
			// 订阅话题列表
			topics := map[string]bool{}
			for _, topic := range client.Topics {
				if _, ok := myTopics[topic]; ok {
					topics[topic] = true
				}
			}
			event.Subscribs[client.User] = topics
			log.Printf("Client added. %d registered clients", len(event.Clients))

		// Remove closed client
		case client := <-event.ClosedClients:
			delete(event.Clients, client.User)
			close(client.C)
			log.Printf("Removed client. %d registered clients", len(event.Clients))

		// Forward message to client
		case eventMsg := <-event.Message:
			for user, topics := range event.Subscribs {
				if _, ok := topics[eventMsg.Topic]; ok {
					event.Clients[user] <- eventMsg
				}
			}
		}
	}
}
