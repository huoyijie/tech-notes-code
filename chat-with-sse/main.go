package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)
// todo:
// 离线消息
// 在线状态
// 未读消息数
// 关闭 tab 页，stream.close 没有退出，不下线
// 可以增加一个接口 /unsubscribe，通知 server，由 server 清理 client
func main() {
	r := gin.Default()
	r.LoadHTMLGlob("templates/*")

	r.GET("join", func(c *gin.Context) {
		username := c.Query("user")
		user, ok := users[username]
		if !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.HTML(http.StatusOK, "index.htm", gin.H{
			"User":  user,
			"Users": filterUsers(username),
		})
	})

	sse := NewSSEvent()
	r.GET("subscribe", subscribe(sse))

	r.POST("send", func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}
		sse.Message <- msg
		c.JSON(http.StatusOK, gin.H{"code": 0})
	})

	r.GET("unsubscribe", unsubscribe(sse))

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
