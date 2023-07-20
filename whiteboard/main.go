package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
)

func main() {
	// 启动单独协程运行 Hub
	hub := newHub()
	go hub.run()

	r := gin.Default()
	// 配置模板
	r.LoadHTMLGlob("templates/*")
	// 配置静态资源
	r.Static("public", "public")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.htm", gin.H{})
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
