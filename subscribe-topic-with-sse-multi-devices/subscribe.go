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

		// Stream message to client
		c.Stream(func(w io.Writer) bool {
			if message, ok := <-client.C; ok {
				c.SSEvent("message", message)
				return true
			}
			return false
		})
	}
}
