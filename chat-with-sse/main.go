package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

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

	r.POST("send", func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}
		c.JSON(http.StatusOK, gin.H{"code": 0})
	})

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
