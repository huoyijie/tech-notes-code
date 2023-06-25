package main

import (
	"log"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	runOAuth2(r)
	runApp(r)

	log.Println("Please open http://localhost:8080")
	log.Fatal(r.Run(":8080"))
}
