package main

import "log"

// Hub 负责保存活跃客户端以及向客户端转发 drawings
type Hub struct {
	// 通过此通道向 Hub 发送 drawings，并由 Hub 进行实时转发
	Drawings chan Drawings
	// 有新客户端连接
	NewClients chan *Client
	// 有客户端断开连接
	CloseClients chan *Client
	// 存储所有客户端连接
	Clients map[string]*Client
}

func newHub() *Hub {
	return &Hub{
		NewClients:   make(chan *Client),
		CloseClients: make(chan *Client),
		Drawings:     make(chan Drawings),

		Clients: make(map[string]*Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		// client 上线
		case client := <-h.NewClients:
			h.Clients[client.ID] = client
			log.Printf("Client added. %d registered clients", len(h.Clients))
		// client 下线
		case client := <-h.CloseClients:
			close(client.Send)
			delete(h.Clients, client.ID)
			log.Printf("Removed client. %d registered clients", len(h.Clients))
		// 向其他 client 转发
		case drawings := <-h.Drawings:
			for k, v := range h.Clients {
				if k != drawings.From {
					v.Send <- drawings.Data
				}
			}
		}
	}
}
