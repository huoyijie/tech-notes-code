package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
)

func main() {
	r := gin.Default()
	r.LoadHTMLGlob("templates/*")
	r.GET("/room/:name", func(c *gin.Context) {
		roomName := c.Param("name")
		c.HTML(http.StatusOK, "index.htm", gin.H{
			"room": roomName,
		})
	})

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
