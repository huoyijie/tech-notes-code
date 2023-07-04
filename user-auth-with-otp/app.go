package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image/png"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
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
	OTP      string `json:"otp"`
}

const (
	authServerURL = "http://127.0.0.1:8080"
)

// 通过 oauth2 server 预先配置的 Client 访问 Authorization server
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

		// 如果开启 OTP 多因子认证
		if u := users[form.Username]; u.OTPKey != nil && !totp.Validate(form.OTP, u.OTPKey.Secret()) {
			// OTP 一次性密码错误
			c.JSON(http.StatusOK, Result{
				Code:    "-10010",
				Message: "Invalid OTP",
			})
			return
		}

		c.JSON(http.StatusOK, Result{Data: token})
	})

	// 开启 OTP 多因子认证
	r.GET("/enable_otp", tokenAuth, func(c *gin.Context) {
		username := c.GetString("username")
		u := users[username]

		// 生成 TOTP 密钥配置
		if u.OTPKey == nil {
			key, err := totp.Generate(totp.GenerateOpts{
				Issuer:      "huoyijie.cn",
				AccountName: username,
			})
			if err != nil {
				panic(err)
			}
			u.OTPKey = key
		}

		// Convert TOTP key into a PNG
		var buf bytes.Buffer
		img, err := u.OTPKey.Image(200, 200)
		if err != nil {
			panic(err)
		}
		png.Encode(&buf, img)

		// 以二维码的方式分享密钥配置
		c.Header("Content-Type", "image/png")
		c.Data(http.StatusOK, "image/png", buf.Bytes())
	})
}

// app.go
// token 认证拦截器，注意 refresh_token 过期需客户端重新登录
func tokenAuth(c *gin.Context) {
	// 优先读取 query 字符串中的 access_token 参数
	token := c.Query("access_token")
	if len(token) == 0 {
		auth := c.GetHeader("Authorization")
		prefix := "Bearer "
		if auth != "" && strings.HasPrefix(auth, prefix) {
			token = auth[len(prefix):]
		}
	}

	// 调用 /oauth/validate_token 验证 token 是否有效
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

	// Token 无效
	if errno := res["err_no"].(string); errno != "0" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, Result{
			Code:    errno,
			Message: res["err_desc"].(string),
		})
		return
	}

	// Token 验证成功
	c.Set("username", res["user_id"])
}
