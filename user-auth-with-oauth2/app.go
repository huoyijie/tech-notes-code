package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

// 统一返回包装类型
type Result struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

const (
	authServerURL = "http://127.0.0.1:9094"
)

// 启动 App
func runApp(r *gin.Engine) {
	r.GET("/siginin", func(c *gin.Context) {
		config := oauth2.Config{
			ClientID:     "100000",
			ClientSecret: "575f508960a9415a97f05a070a86165b",
			Endpoint: oauth2.Endpoint{
				TokenURL: authServerURL + "/oauth/token",
			},
		}

		token, err := config.PasswordCredentialsToken(context.Background(), "test", "test")
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, Result{Data: token})
	})
}
