// event.go
package main

import "log"

// 向客户端发布消息的 Channel
type ClientChan chan Message

// 客户端
type Client struct {
	User string
	C    ClientChan
}

type SSEvent struct {
	Message chan Message

	// 新连接 Channel
	NewClients chan Client

	// 关闭连接 Channel
	ClosedClients chan string

	// 所有客户端连接
	Clients map[string]ClientChan

	// 存储用户离线消息
	Messages map[string][]Message
}

// 创建 Event 对象
func NewSSEvent() (sse *SSEvent) {
	sse = &SSEvent{
		Message:       make(chan Message),
		NewClients:    make(chan Client),
		ClosedClients: make(chan string),
		Clients:       make(map[string]ClientChan),
		Messages:      make(map[string][]Message),
	}

	// 启动单独一个协程内更新 Clients/Messages，避免并发读写 map
	go sse.listen()
	return
}

func (sse *SSEvent) listen() {
	for {
		select {
		// Add new available client
		case client := <-sse.NewClients:
			sse.Clients[client.User] = client.C
			// 上线
			users[client.User].Online = true
			// 广播上线状态
			for k, v := range sse.Clients {
				if k != client.User {
					v <- Message{
						Kind: "online",
						From: client.User,
					}
				}
			}
			// todo 下发离线消息
			log.Printf("Client added. %d registered clients", len(sse.Clients))

		// Remove closed client
		case user := <-sse.ClosedClients:
			if c, ok := sse.Clients[user]; ok {
				close(c)
				delete(sse.Clients, user)
				// 下线
				users[user].Online = false
				// 广播上线状态
				for k, v := range sse.Clients {
					if k != user {
						v <- Message{
							Kind: "offline",
							From: user,
						}
					}
				}
				log.Printf("Removed client. %d registered clients", len(sse.Clients))
			}

		// 如果目标用户在线则转发，否则存储离线消息
		case msg := <-sse.Message:
			if c, ok := sse.Clients[msg.To]; ok {
				c <- msg
			} else {
				if messages, ok := sse.Messages[msg.To]; ok {
					sse.Messages[msg.To] = append(messages, msg)
				} else {
					sse.Messages[msg.To] = []Message{msg}
				}
			}
		}
	}
}
