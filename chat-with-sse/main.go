package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
)

func main() {
	r := gin.Default()
	r.LoadHTMLGlob("templates/*")
	r.GET("/room/:name/join", func(c *gin.Context) {
		roomName := c.Param("name")

		username := c.Query("user")
		user, ok := users[username]
		if !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.HTML(http.StatusOK, "index.htm", gin.H{
			"Room":  roomName,
			"User":  user,
			"Users": filterUsers(username),
		})
	})

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
