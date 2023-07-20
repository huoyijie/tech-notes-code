package main

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)

const (
	// 写超时, 10s
	writeWait = 10 * time.Second
	// 读 pong 帧超时, 60s
	pongWait = 60 * time.Second
	// 写 ping 帧周期(必须小于 pongWait), 54s
	pingPeriod = (pongWait * 9) / 10
)

// http/1.1 -> websocket 协议升级
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client 是 websocket 和 Hub 的中间人
type Client struct {
	// Client ID
	ID  string
	Hub *Hub
	// websocket 连接
	Conn *websocket.Conn
	// 发送 drawings 通道
	Send chan []Drawing
}

// readPump 从 websocket 连接读 drawings 并转发给 Hub。应用程序为每个 websocket 连接分配一个独立的协程，并确保最多只有一个 reader 从此协程读取数据。
func (c *Client) readPump() {
	// 当前方法退出前清理资源
	defer func() {
		c.Hub.CloseClients <- c
		c.Conn.Close()
	}()
	// 设置 60s 后读超时，并设置 pong Handler，每收到 pong 都会向后延长读超时
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	// 循环读取 drawings
	for {
		_, bytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		// msgpack 反序列化
		var drawings []Drawing
		err = msgpack.Unmarshal(bytes, &drawings)
		if err != nil {
			log.Printf("msgpack unmarshal error: %v", err)
			break
		}
		// 转 drawings 到 Hub
		c.Hub.Drawings <- Drawings{
			From: c.ID,
			Data: drawings,
		}
	}
}

// writePump 从 Hub 读 drawings 并转发到 websocket 连接，应用程序为每个 websocket 连接分配一个独立的协程，并确保最多只有一个 writer 向此协程写数据。
func (c *Client) writePump() {
	// 写 ping 帧周期
	ticker := time.NewTicker(pingPeriod)
	// 当前方法退出前清理资源
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	// 写 drawings 循环
	for {
		select {
		case drawings, ok := <-c.Send:
			// 设置写数据 10s 后超时
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// msgpack 序列化
			bytes, err := msgpack.Marshal(&drawings)
			if err != nil {
				log.Printf("msgpack marshal error: %v", err)
				return
			}

			// binary message
			err = c.Conn.WriteMessage(websocket.BinaryMessage, bytes)
			if err != nil {
				return
			}
		// 周期发送 ping
		case <-ticker.C:
			// 设置写 ping 帧 10s 后超时
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// serveWs 处理来自客户端的 websocket 请求
func serveWs(hub *Hub, c *gin.Context) {
	ID := c.Query("ID")
	// 协商协议升级到 websocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}
	// 为每个 websocket 连接创建中间人
	client := &Client{ID: ID, Hub: hub, Conn: conn, Send: make(chan []Drawing, 256)}
	client.Hub.NewClients <- client

	// 为当前 websocket 连接启动协程，从 Hub 读数据并转发到浏览器
	go client.writePump()
	// 为当前 websocket 连接启动协程，从浏览器读数据并转发到 Hub
	go client.readPump()
}
