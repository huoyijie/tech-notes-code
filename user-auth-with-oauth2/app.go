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

// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

const (
	authServerURL = "http://127.0.0.1:8080"
)

// 启动 App
func runApp(r *gin.Engine) {
	r.POST("/signin", func(c *gin.Context) {
		form := &SigninForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		config := oauth2.Config{
			ClientID:     "100000",
			ClientSecret: "575f508960a9415a97f05a070a86165b",
			Endpoint: oauth2.Endpoint{
				TokenURL: authServerURL + "/oauth/token",
			},
		}

		token, err := config.PasswordCredentialsToken(context.Background(), form.Username, form.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, Result{
				Code: -10000,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Result{Data: token})
	})
}
