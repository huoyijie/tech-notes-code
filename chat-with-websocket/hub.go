package main

import "log"

// Hub maintains the set of active clients and forward messages to the
// clients.
type Hub struct {
	// Inbound Message from the clients.
	Message chan Message
	// Register requests from the clients.
	NewClients chan *Client
	// Unregister requests from clients.
	CloseClients chan *Client
	// 所有客户端连接
	Clients map[string]*Client
	// 存储用户离线消息
	Messages map[string][]Message
}

func newHub() *Hub {
	return &Hub{
		NewClients:   make(chan *Client),
		CloseClients: make(chan *Client),
		Message:      make(chan Message),

		Clients:  make(map[string]*Client),
		Messages: make(map[string][]Message),
	}
}

func (h *Hub) run() {
	for {
		select {
		// 用户上线
		case client := <-h.NewClients:
			h.Clients[client.User] = client
			// 广播在线消息
			for k, v := range h.Clients {
				if k != client.User {
					// 给新上线 client 逐一发送其他人在线状态
					client.Send <- Message{
						Kind: "online",
						From: k,
					}
					// 新上线 client 广播上线消息
					v.Send <- Message{
						Kind: "online",
						From: client.User,
					}
				}
			}
			// 下发离线消息
			if messages, ok := h.Messages[client.User]; ok && len(messages) > 0 {
				for _, message := range messages {
					client.Send <- message
				}
				// 删除离线消息
				delete(h.Messages, client.User)
			}
			log.Printf("Client added. %d registered clients", len(h.Clients))
		// 用户下线
		case client := <-h.CloseClients:
			close(client.Send)
			delete(h.Clients, client.User)
			// 广播下线状态
			for k, v := range h.Clients {
				if k != client.User {
					v.Send <- Message{
						Kind: "offline",
						From: client.User,
					}
				}
			}
			log.Printf("Removed client. %d registered clients", len(h.Clients))
		// 如果目标用户在线则转发，否则存储离线消息
		case msg := <-h.Message:
			if client, ok := h.Clients[msg.To]; ok {
				// 目标用户在线，转发
				client.Send <- msg
			} else {
				// 目标用户在线，离线存储消息
				if messages, ok := h.Messages[msg.To]; ok {
					h.Messages[msg.To] = append(messages, msg)
				} else {
					h.Messages[msg.To] = []Message{msg}
				}
			}
		}
	}
}
