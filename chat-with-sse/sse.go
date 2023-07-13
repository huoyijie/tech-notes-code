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
	// 新连接 Channel
	NewClients chan Client
	// 关闭连接 Channel
	ClosedClients chan string
	// 消息 Channel
	Message chan Message

	// 所有客户端连接
	Clients map[string]ClientChan
	// 存储用户离线消息
	Messages map[string][]Message
}

// 创建 Event 对象
func NewSSEvent() (sse *SSEvent) {
	sse = &SSEvent{
		NewClients:    make(chan Client),
		ClosedClients: make(chan string),
		Message:       make(chan Message),

		Clients:  make(map[string]ClientChan),
		Messages: make(map[string][]Message),
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
			// 广播在线消息
			for k, v := range sse.Clients {
				if k != client.User {
					// 给新上线 client 逐一发送其他人在线状态
					client.C <- Message{
						Kind: "online",
						From: k,
					}
					// 新上线 client 广播上线消息
					v <- Message{
						Kind: "online",
						From: client.User,
					}
				}
			}
			// 下发离线消息
			if messages, ok := sse.Messages[client.User]; ok && len(messages) > 0 {
				for _, message := range messages {
					client.C <- message
				}
				// 删除离线消息
				delete(sse.Messages, client.User)
			}
			log.Printf("Client added. %d registered clients", len(sse.Clients))

		// Remove closed client
		case user := <-sse.ClosedClients:
			if c, ok := sse.Clients[user]; ok {
				close(c)
				delete(sse.Clients, user)
				// 广播下线状态
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
