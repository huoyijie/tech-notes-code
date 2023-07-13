// subscribe.go
package main

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func subscribe(sse *SSEvent) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Query("user")

		// 判断用户是否存在
		if _, ok := users[user]; !ok {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
			return
		}

		// 创建新客户端
		client := Client{
			User: user,
			C:    make(ClientChan),
		}
		sse.NewClients <- client

		// 如果连接端开，删除该客户端
		defer func() {
			sse.ClosedClients <- user
		}()

		// Stream message to client
		c.Stream(func(w io.Writer) bool {
			// 发送该 client Channel 的消息通过 SSE Stream 发给浏览器
			if message, ok := <-client.C; ok {
				c.SSEvent("message", message)
				return true
			}
			return false
		})
	}
}

func unsubscribe(sse *SSEvent) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Query("user")

		// 判断用户是否存在
		if _, ok := users[user]; !ok {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
			return
		}

		sse.ClosedClients <- user
		c.JSON(http.StatusOK, gin.H{"code": 0})
	}
}
