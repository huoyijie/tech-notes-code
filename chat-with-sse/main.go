package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	// 配置模板
	r.LoadHTMLGlob("templates/*")
	// 配置静态资源
	r.Static("public", "public")

	// 登录聊天请求
	r.GET("join", func(c *gin.Context) {
		username := c.Query("user")
		if _, ok := users[username]; !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.HTML(http.StatusOK, "index.htm", gin.H{
			"User":  gin.H{"Username": username},
			"Users": filterUsers(username),
		})
	})

	// 订阅 SSE 请求
	sse := NewSSEvent()
	r.GET("subscribe", subscribe(sse))

	// 发消息请求
	r.POST("send", func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}
		sse.Message <- msg
		c.JSON(http.StatusOK, gin.H{"code": 0})
	})

	// 取消订阅 SSE 请求
	r.GET("unsubscribe", unsubscribe(sse))

	// 启动服务器
	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
