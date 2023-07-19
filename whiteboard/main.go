package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
)

func main() {
	r := gin.Default()
	// 配置模板
	r.LoadHTMLGlob("templates/*")
	// 配置静态资源
	r.Static("public", "public")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.htm", gin.H{})
	})

	// 启动服务器
	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
