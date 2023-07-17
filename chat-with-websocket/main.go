package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	hub := newHub()
	go hub.run()

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

	// 建立 websocket 连接
	r.GET("ws", func(c *gin.Context) {
		serveWs(hub, c)
	})

	// 启动服务器
	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
