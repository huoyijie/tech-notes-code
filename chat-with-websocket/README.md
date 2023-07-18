# 基于 Websocket 和 React 实现一个 IM 原型

本文主要基于 Websocket、React、msgpack、Tailwind CSS 等技术实现一个即时通信 IM 原型，支持发送/接收实时消息、离线消息，支持显示用户在线状态，支持显示未读消息数等功能。主要是探索如何通过 websocket+msgpack 实现客户端与服务器的双向通信。前端复用了[基于 Server Sent Events 和 React 实现一个 IM 原型](https://huoyijie.cn/docsifys/Tech-Notes/chat-with-sse-react)里的代码，采用 React 简化了应用状态与 UI 之间的同步，并引入时下非常流行的 Tailwind CSS 库。

![chat-with-sse-react](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react.png)

## Github 项目地址

本文代码在 [tech-notes-code/chat-with-websocket](https://github.com/huoyijie/tech-notes-code) 目录下，代码注释很详细，可以边看文章边看代码。

## Websocket

![websocket logo](https://cdn.huoyijie.cn/uploads/2023/07/websocket-logo.jpg)

WebSocket 是一种与 HTTP 不同的协议。两者都位于 OSI 模型的应用层，并且都依赖于传输层的 TCP 协议。虽然它们不同，但是 WebSocket 可通过 HTTP 端口 80 和 443 进行工作，并支持 HTTP 代理，从而使其与 HTTP 协议兼容。为了实现兼容性，WebSocket握手使用 HTTP Upgrade 头从 HTTP 协议升级为 WebSocket 协议。

WebSocket 协议支持 Web 浏览器（或其他客户端应用程序）与 Web 服务器之间的交互，具有较低的开销，便于实现客户端与服务器的实时数据传输。服务器可以通过标准化的方式来实现，而无需客户端首先请求内容，并允许消息在保持连接打开的同时来回传递。通过这种方式，可以在客户端和服务器之间进行双向持续对话。*更多介绍可参考[WebSocket](https://zh.wikipedia.org/zh-cn/WebSocket)*

## 客户端与服务器通信

```
                         (huoyijie)
                          +------+
                          |      |
+------+                  |Chrome|
|      |<---websocket---->|      |
| HTTP |        |         +------+
|      |    双向通信连接
|Server|        |         +------+
|      |<---websocket---->|      |
+------+                  |Chrome|
                          |      |
                          +------+
                           (jack)
```

每个用户打开客户端后，会自动连接服务器并发送升级协议请求，服务器确认升级协议后，双方建立 websocket 连接，后续客户端与服务器可通过 websocket 连接实现双向通信。从 HTTP 到 Websocket 的协议升级请求也称作 Websocket 握手。主要过程如下:

**客户端发送如下 GET 请求**

```bash
GET /chat HTTP/1.1
Host: example.com:8000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

**服务器返回如下响应完成 Websocket 握手**

```bash
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

## msgpack

![msgpack introduce](https://cdn.huoyijie.cn/uploads/2023/07/msgpack-intro.png)

[msgpack](https://github.com/msgpack/msgpack) 是一种高效的二进制序列化格式，很像 json，但是运行速度更快、序列化后数据更小，支持各种语言。

如下面是用户 `rose` 发给 `huoyijie` 的消息对象

```js
{
  kind: 'text',
  from: 'rose',
  to: 'huoyijie',
  data: 'aaa',
  sent: 1689644606604
}
```

会经过 msgpack 序列化为二进制字节数组，并通过 websocket 连接发送给服务器。如下是打印到控制台的字节数组:

```js
[133, 164, 107, 105, 110, 100, 164, 116, 101, 120, 116, 164, 102, 114, 111, 109, 164, 114, 111, 115, 101, 162, 116, 111, 168, 104, 117, 111, 121, 105, 106, 105, 101, 164, 100, 97, 116, 97, 163, 97, 97, 97, 164, 115, 101, 110, 116, 207, 0, 0, 1, 137, 102, 170, 164, 140, buffer: ArrayBuffer(2048), byteLength: 56, byteOffset: 0, length: 56, Symbol(Symbol.toStringTag): 'Uint8Array']
```

下图中右下方的 ArrayBuffer 显示的就是序列化后的字节数组内容，是通过 Chrome DevTools 内存检查器生成的。

![msgpack arraybuffer](https://cdn.huoyijie.cn/uploads/2023/07/msgpack-arraybuffer.png)

## 服务器

**Web 服务器**

服务器使用 [Gin](https://github.com/gin-gonic/gin) Web 框架搭建 Web 服务器。

**Websocket**

服务器通过 [gorilla/websocket](https://github.com/gorilla/websocket) 库支持 Websocket 协议。

**msgpack**

服务器使用 [vmihailenco/msgpack](https://github.com/vmihailenco/msgpack) 库实现消息序列化/反序列化。

## 客户端

**msgpack**

前端使用 [msgpack/msgpack-javascript](https://github.com/msgpack/msgpack-javascript) 库实现消息序列化/反序列化。

**React**

前端使用的 [React](https://zh-hans.react.dev/) 框架，通过定义函数式组件把 UI 拆分成不同的嵌套组件，在每个组件内部控制自己的状态和样式。应用组件思想构建 UI，有点像搭乐高很有趣。一方面 React 可以帮助你根据应用状态自动更新 UI 展示，无需手动操作 DOM 元素。另一方面没有了长长的 html 代码片段，而是拆分成了很多的 jsx 组件文件，每个组件单独一个文件，代码结构更清晰。

```bash
$ tree -l
├── public
│   ├── images
│   │   ├── huoyijie.svg
│   │   ├── jack.svg
│   │   └── rose.svg
│   └── js
│       ├── App.jsx
│       ├── ChatBoxHeader.jsx
│       ├── ChatBoxInput.jsx
│       ├── ChatBox.jsx
│       ├── ChatBoxMessageList.jsx
│       ├── Chat.jsx
│       ├── Header.jsx
│       ├── Message.jsx
│       ├── PaperPlane.jsx
│       ├── UserList.jsx
│       ├── Users.jsx
│       └── ws.js
├── client.go
├── data.go
├── hub.go
├── main.go
└── templates
    └── index.htm
```

上述是代码目录结构，`public/js` 目录下是所有的函数组件，下图标记了主要的组件。

![react-components](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react-components.png)

**Tailwind CSS**

CSS 样式是用时下非常流行的 [Tailwind (A utility-first CSS framework)](https://tailwindcss.com/) 写的，可以通过非常丰富的内置 class 精细的控制页面样式。

## 运行

![chat-with-rose](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-rose.png)

![chat-with-sse-react](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react.png)

## Websocket 相关代码

**服务器**

```go
// hub.go
// Hub 负责保存活跃客户端以及向客户端转发消息
type Hub struct {
	// 通过此通道向 Hub 发送消息，并由 Hub 进行离线存储或实时转发
	Message chan Message
	// 有新客户端连接
	NewClients chan *Client
	// 有客户端断开连接
	CloseClients chan *Client
	// 存储所有客户端连接
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
```

```go
// client.go
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
	// 用户
	User string
	Hub  *Hub
	// websocket 连接
	Conn *websocket.Conn
	// 发送消息通道
	Send chan Message
}

// readPump 从 websocket 连接读消息并转发给 Hub。应用程序为每个 websocket 连接分配一个独立的协程，并确保最多只有一个 reader 从此协程读取消息。
func (c *Client) readPump() {
	// 当前方法退出前清理资源
	defer func() {
		c.Hub.CloseClients <- c
		c.Conn.Close()
	}()
	// 设置 60s 后读超时，并设置 pong Handler，每收到 pong 都会向后延长读超时
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	// 循环读取消息
	for {
		_, bytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		// msgpack 反序列化
		var message Message
		err = msgpack.Unmarshal(bytes, &message)
		if err != nil {
			log.Printf("msgpack unmarshal error: %v", err)
			break
		}
		// 转发消息到 Hub
		c.Hub.Message <- message
	}
}

// writePump 从 Hub 读消息并转发到 websocket 连接，应用程序为每个 websocket 连接分配一个独立的协程，并确保最多只有一个 writer 向此协程写消息。
func (c *Client) writePump() {
	// 写 ping 帧周期
	ticker := time.NewTicker(pingPeriod)
	// 当前方法退出前清理资源
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	// 写消息循环
	for {
		select {
		case message, ok := <-c.Send:
			// 设置写消息 10s 后超时
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// msgpack 序列化
			bytes, err := msgpack.Marshal(&message)
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
	user := c.Query("user")
	// 协商协议升级到 websocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}
	// 为每个 websocket 连接创建中间人
	client := &Client{User: user, Hub: hub, Conn: conn, Send: make(chan Message, 256)}
	client.Hub.NewClients <- client

	// 为当前 websocket 连接启动协程，从 Hub 读消息并转发到浏览器
	go client.writePump()
	// 为当前 websocket 连接启动协程，从浏览器读消息并转发到 Hub
	go client.readPump()
}
```

**客户端**

```js
// public/js/ws.js
const { encode, decode } = MessagePack;

// 全局 ws
const ws = {
  conn: null,
  users: AllUsers,
  messages: [],
  // 建立 ws 连接
  connect() {
    this.conn = new WebSocket(`ws://${location.host}/ws?user=${User.Username}`);
    // ws 已连接
    this.conn.onopen = () => {
      console.log('ws connected');
    };

    // 收到 message
    this.conn.onmessage = async (e) => {
      const bytes = await e.data.arrayBuffer();
      const message = decode(bytes);
      console.log(bytes, message);

      // 收到文本消息
      if (message.kind === 'text') {
        // 收到新消息
        ws.messages.push(message);
        // 必须重新构造对象, react 才能够观察到数据变化，并重新渲染 UI
        ws.messages = [...ws.messages];
        if (ws.notifyMessages) {
          ws.notifyMessages();
        } else {
          // 如果 React App 还未初始化好，则稍后再通知数据变化
          const intervalId = setInterval(() => {
            if (ws.notifyMessages) {
              ws.notifyMessages();
              clearInterval(intervalId);
            }
          }, 50);
        }
        return;
      }

      // 更新用户列表中，用户在线状态显示
      const updateUserStatus = (online) => {
        for (let u of ws.users) {
          if (u.username === message.from) {
            u.online = online;
            break;
          }
        }
        // 必须重新构造对象, react 才能够观察到数据变化，并重新渲染 UI
        ws.users = [...ws.users];
        if (ws.notifyUsers) {
          ws.notifyUsers();
        } else {
          // 如果 React App 还未初始化好，则稍后再通知数据变化
          const intervalId = setInterval(() => {
            if (ws.notifyUsers) {
              ws.notifyUsers();
              clearInterval(intervalId);
            }
          }, 50);
        }
      };

      // 收到上下线消息
      if (message.kind === 'online') {
        // 用户上线
        updateUserStatus(true);
      } else if (message.kind === 'offline') {
        // 用户下线
        updateUserStatus(false);
      }
    };

    // websocket 连接断开后自动重连
    this.conn.onclose = (e) => {
      console.log('ws disconnected and reconnect');
      ws.connect();
    };

    // 遇到错误，关闭连接
    this.conn.onerror = (err) => {
      console.log('ws error', err);
      ws.conn.close();
    };
  },
  // 发送消息
  send(message) {
    if (this.conn) {
      const bytes = encode(message);
      console.log(message, bytes);
      this.conn.send(bytes);
      // 添加到消息列表
      this.messages.push(message);
      if (this.notifyMessages) {
        // 必须重新构造对象
        this.messages = [...this.messages];
        this.notifyMessages();
      }
    }
  },
  // 设置消息已读
  hasRead(u) {
    if (this.notifyMessages) {
      // 必须重新构造对象
      this.messages = this.messages.map((msg) => {
        if (msg.from === u.username && !msg.read) {
          msg.read = true;
        }
        return msg;
      });
      this.notifyMessages();
    }
  },
  // 关闭 ws 连接
  close() {
    if (this.conn) {
      this.conn.onclose = null;
      this.conn.close();
    }
  }
};

// 请求建立 ws 连接
ws.connect();
// 关闭页面时，同步关闭 ws 连接
window.addEventListener('beforeunload', ws.close);
```

## 最后

与上文中[基于 HTTP(SSE+POST) 协议的轻量级方案](https://huoyijie.cn/docsifys/Tech-Notes/chat-with-sse-react)相比较，基于 Websocket 的方案代码略复杂，但是通信相关代码更统一，完全基于 websocket 双向通信，代码更集中(服务器 client.go、客户端 ws.js)，且 Websocket 支持发送二进制数据，由此引入了比 json 更高效的 msgpack 二进制序列化格式。