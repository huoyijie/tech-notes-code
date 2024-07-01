# 基于 SSE 实现多设备话题订阅机制

在[基于 HTTP SSE(Server Sent Event) 实现话题订阅机制](https://huoyijie.cn/docsifys/Tech-Notes/subscribe-topic-with-sse#/)这篇文章中，介绍了如何基于 SSE 实现客户端话题订阅机制。但是有一个限制是同一个用户，只能通过一个设备接收信息，如果同一个用户使用了多个设备无法同时接收信息。原来的代码主要是以用户为基础进行话题订阅，本文在之前的代码基础上进行了调整，基于 device uuid 来订阅话题，下面进入实操环节：

## SSE 多设备话题订阅实例

文中所有代码已放到 [Github subscribe-topic-with-sse-multi-devices](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*

* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）

创建 subscribe-topic-with-sse-multi-devices 项目

```bash
$ mkdir subscribe-topic-with-sse-multi-devices && cd subscribe-topic-with-sse-multi-devices
$ go mod init subscribe-topic-with-sse-multi-devices
```

新增 mydb.go 文件，添加测试用户和话题数据:

```go
// mydb.go
package main

// 所有注册设备和用户
var myDevices = map[string]string{
	"fd42cee5-118c-4aba-810b-5743c07dfac7": "huoyijie",
	"5ee9ca57-0267-4a4a-a1e3-cc42fc24f87e": "huoyijie",
	"6d76284b-17b7-4abd-b2bd-3f8f51197d8f": "jack",
}

// 所有注册话题
var myTopics = map[string]bool{
	"chatgpt": true,
	"robot":   true,
}
```

新增 types.go 文件，添加如下几个类型:

```go
// types.go
package main

// 在某个话题上发布消息时会创建消息对象
type Message struct {
	Topic string `json:"topic" binding:"required"`
	Data  string `json:"data" binding:"required"`
}

// 向客户端发布消息的 Channel
type ClientChan chan Message

// 客户端，封装用户、订阅话题列表及客户端 Channel
type Client struct {
	Device string
	Topics []string
	C      ClientChan
}
```

新增 event.go，添加最核心的 Event 类型:

```go
// event.go
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

	// 所有设备的订阅话题
	// 格式: map["device-uuid"]map["chatgpt"]true
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
			event.Clients[client.Device] = client.C
			// 订阅话题列表
			topics := map[string]bool{}
			for _, topic := range client.Topics {
				if _, ok := myTopics[topic]; ok {
					topics[topic] = true
				}
			}
			event.Subscribs[client.Device] = topics
			log.Printf("Client added. %d registered clients", len(event.Clients))

		// Remove closed client
		case client := <-event.ClosedClients:
			delete(event.Clients, client.Device)
			delete(event.Subscribs, client.Device)
			close(client.C)
			log.Printf("Removed client. %d registered clients", len(event.Clients))

		// Forward message to client
		case eventMsg := <-event.Message:
			for device, topics := range event.Subscribs {
				if _, ok := topics[eventMsg.Topic]; ok {
					event.Clients[device] <- eventMsg
				}
			}
		}
	}
}
```

新增 subscribe.go 文件，添加客户端订阅话题 Handler:

```go
// subscribe.go
package main

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func subscribe(event *Event) gin.HandlerFunc {
	return func(c *gin.Context) {
		device := c.Query("device")
		topics := c.Query("topics")

		// 判断用户是否存在，订阅话题是否为空
		if _, ok := myDevices[device]; !ok || len(topics) == 0 {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
			return
		}

		// 创建新客户端
		client := Client{
			Device: device,
			Topics: strings.Split(topics, "|"),
			C:      make(ClientChan),
		}
		event.NewClients <- client

		// 如果连接端开，删除该客户端
		defer func() {
			event.ClosedClients <- client
		}()

		// Stream message to client (浏览器)
		c.Stream(func(w io.Writer) bool {
			if message, ok := <-client.C; ok {
				c.SSEvent("message", message)
				return true
			}
			return false
		})
	}
}
```

新增 publish.go 文件，添加发布话题消息 Handler:

```go
// publish.go
package main

import "github.com/gin-gonic/gin"

func publish(event *Event) gin.HandlerFunc {
	return func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}

		// 发布话题
		event.Message <- msg
	}
}
```

新增 home.go，添加 web 页面:

```go
// home.go
package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func home() gin.HandlerFunc {
	return func(c *gin.Context) {
		device := c.Query("device")
		topics := c.Query("topics")

		// 判断用户是否存在，订阅话题是否为空
		if user, ok := myDevices[device]; !ok || len(topics) == 0 {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
		} else {
			c.Writer.WriteString(fmt.Sprintf(`
				<!doctype html>
				<html lang="en">
	
				<head>
						<meta charset="UTF-8">
						<title>Server Sent Event</title>
				</head>
	
				<body>
				<div>Device: %s</div>
				<div>User: %s</div>
				<br>
				<div>Topic Messages:</div>
				<div class="event-data"></div>
				</body>
	
				<script src="https://code.jquery.com/jquery-1.11.1.js"></script>
				<script>
						// EventSource object of javascript listens the streaming events from our go server and prints the message.
						var stream = new EventSource("/subscribe?device=%s&topics=%s");
						stream.addEventListener("message", function(e){
								$('.event-data').append(e.data + "</br>")
						});
				</script>
	
				</html>`, device, user, device, topics))
		}
	}
}
```

请求 `http://host:port/?device=uuid&topics=chatgpt|robot` 时会返回上述页面，注意上面 js 代码部分:

```javascript
var stream = new EventSource("/subscribe?device=%s&topics=%s");
stream.addEventListener("message", function(e){
    $('.event-data').append(e.data + "</br>")
});
```

页面打开后，会马上请求 `/subscribe?device=uuid&topics=chatgpt|robot` 实现用户设备 `uuid` 对话题列表 `chatgpt|robot` 的订阅。然后当某个话题有新消息时，就会自动通过 SSE Stream 发送消息到 web 页面。

最后添加 main.go 文件，添加 Handler 注册代码:

```go
// main.go
package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	event := NewEvent()

	r := gin.Default()
	r.GET("/", home())

	// 订阅话题消息
	r.GET("subscribe", subscribe(event))

	// 发布话题消息
	r.POST("publish", publish(event))
	r.Run(":8000")
}
```

接下来安装依赖和启动服务器:

```bash
# 下载安装依赖
$ go mod tidy

# 运行应用
$ go run .
```

打开第1个浏览器 Tab 页面，访问 URL: `http://localhost:8000/?device=fd42cee5-118c-4aba-810b-5743c07dfac7&topics=chatgpt`

打开第2个 Tab 页面，访问 URL: `http://localhost:8000/?device=5ee9ca57-0267-4a4a-a1e3-cc42fc24f87e&topics=chatgpt`

上面2个页面模拟同一个用户 `huoyijie` 在不同的设备上订阅了 `chatgpt` 话题。

接下来打开第3个 Tab 页面，访问 URL: `http://localhost:8000/?device=6d76284b-17b7-4abd-b2bd-3f8f51197d8f&topics=chatgpt|robot`

这是另一个 jack 用户订阅了 `chatgpt|robot` 两个话题。

![Subscribe topic](https://cdn.huoyijie.cn/uploads/2024/07/sse-subscribe-topic.png)

接下来测试发布话题消息:

```bash
# 向 robot 话题发布消息
$ curl -d '{"topic": "robot", "data": "hi robot"}' http://localhost:8000/publish
```

只有用户 `jack` 的设备收到了 `hi robot` 消息，因为只有 `jack` 订阅了 `robot`。

![received robot](https://cdn.huoyijie.cn/uploads/2024/07/sse-publish-1.png)

```bash
# 向 chatgpt 话题发布消息
curl -d '{"topic": "chatgpt", "data": "hi chatgpt"}' http://localhost:8000/publish
```

3个设备 (2个用户) 都收到了 `hi chatgpt` 消息，因为他们都订阅了 `chatgpt`。

![received chatgpt](https://cdn.huoyijie.cn/uploads/2024/07/sse-publish-2.png)

## 最后

待续...