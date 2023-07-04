package main

import (
	"github.com/gin-gonic/gin"
	"log"
)

func main() {
	r := gin.Default()
	runOAuth2(r)
	runApp(r)

	log.Fatal(r.Run(":8080"))
}
