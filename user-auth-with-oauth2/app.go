package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

// 统一返回包装类型
type Result struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

// 刷新 token 表单
type RefreshForm struct {
	AccessToken string `json:"access_token" binding:"required"`

	RefreshToken string `json:"refresh_token,omitempty" binding:"required"`
}

const (
	authServerURL = "http://127.0.0.1:8080"
)

var config = oauth2.Config{
	ClientID:     "100000",
	ClientSecret: "575f508960a9415a97f05a070a86165b",
	Endpoint: oauth2.Endpoint{
		TokenURL: authServerURL + "/oauth/token",
	},
}

// 启动 App
func runApp(r *gin.Engine) {
	// 登录获取 token
	r.POST("/signin", func(c *gin.Context) {
		form := &SigninForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		// 通过提供用户名、密码获取 token
		token, err := config.PasswordCredentialsToken(context.Background(), form.Username, form.Password)
		if err != nil {
			if e, ok := err.(*oauth2.RetrieveError); ok {
				c.JSON(http.StatusOK, Result{
					Code:    e.ErrorCode,
					Message: e.ErrorDescription,
				})
				return
			}
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		c.JSON(http.StatusOK, Result{Data: token})
	})

	// 刷新 token，注意 refresh_token 过期需客户端重新登录
	r.POST("refresh", func(c *gin.Context) {
		form := &RefreshForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		// 自动获取新的 access and refresh token
		token, err := config.TokenSource(context.Background(), &oauth2.Token{
			AccessToken:  form.AccessToken,
			TokenType:    "Bearer",
			RefreshToken: form.RefreshToken,
			Expiry:       time.Now(),
		}).Token()

		if err != nil {
			if e, ok := err.(*oauth2.RetrieveError); ok {
				c.JSON(http.StatusOK, Result{
					Code:    e.ErrorCode,
					Message: e.ErrorDescription,
				})
				return
			}
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		c.JSON(http.StatusOK, Result{
			Data: token,
		})
	})

	// private 接口配置了 tokenAuth 拦截器，拦截器会自动进行 Token 认证，
	// 认证成功会把 username 写入上下文中，认证失败会返回 401
	r.GET("private", tokenAuth, func(c *gin.Context) {
		username := c.GetString("username")
		c.JSON(http.StatusOK, Result{
			Data: username,
		})
	})
}

// token 认证拦截器，注意 refresh_token 过期需客户端重新登录
func tokenAuth(c *gin.Context) {
	auth := c.GetHeader("Authorization")
	prefix := "Bearer "
	token := ""
	if auth != "" && strings.HasPrefix(auth, prefix) {
		token = auth[len(prefix):]
	}

	resp, err := http.Get(fmt.Sprintf("%s/oauth/validate_token?access_token=%s", authServerURL, token))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, Result{
			Code:    "-10000",
			Message: err.Error(),
		})
		return
	} else if resp.StatusCode == http.StatusNotFound {
		c.AbortWithStatusJSON(http.StatusInternalServerError, Result{
			Code:    "-10001",
			Message: "/validate_token not found",
		})
		return
	}
	defer resp.Body.Close()

	d := json.NewDecoder(resp.Body)
	var res gin.H
	d.Decode(&res)
	if errno := res["err_no"].(string); errno != "0" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, Result{
			Code:    errno,
			Message: res["err_desc"].(string),
		})
		return
	}

	c.Set("username", res["user_id"])
}
