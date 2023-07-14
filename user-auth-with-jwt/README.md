# 基于 JWT Token 实现用户认证

## JWT Token

[JWT(JSON Web Token)](https://jwt.io/) 是一个签了名且使用 base64 编码过的 JSON 对象，非常适合作为 Web 用户认证后下发给客户端的 Bearer Token，它由 Header、JSON 对象和签名三部分组成，三个部分由`.`分隔。

```
JWT Token = Header.(JSON Object).签名
```

Header 部分主要包含生成签名的算法参数，验证签名时会用到。JSON Ojbect 部分可携带非敏感的用户信息。然后是签名部分，用来防止第三方伪造 Token。

JWT 有两种类型的签名算法，一种是基于对称加密算法，另一种是基于非对称加密算法，生成新 Token 时可以指定签名算法，并提供算法相对应的密钥。

本文通过 [golang-jwt](https://github.com/golang-jwt/jwt) 库来生成和验证 Token，下面开始实现基于 JWT 的用户认证。

## 用户认证

文中所有代码已放到 [Github user-auth-with-jwt](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*
* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）

创建项目 user-auth-with-jwt

```bash
$ mkdir user-auth-with-jwt && cd user-auth-with-jwt
$ go mod init user-auth-with-jwt
$ touch main.go
```

编辑 main.go，并添加下面的代码

```go
// main.go
package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.Writer.WriteString("Hello, world!")
	})
	r.Run("0.0.0.0:8080")
}
```

允许 `go mod tidy` 自动下载安装依赖包，然后运行应用

```bash
$ go mod tidy
go: finding module for package github.com/gin-gonic/gin
go: found github.com/gin-gonic/gin in github.com/gin-gonic/gin v1.9.1

# 运行应用
$ go run .
```

打开浏览器访问 http://localhost:8080，应该会看到 `Hello, world!`。接下来实现登录接口，返回 JWT Token。

```go
// main.go
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

// 用户模型
type User struct {
	Username, PasswordHash string
}

// 模拟数据库存储，真实应用需写入数据库表中
var users = map[string]User{
	"huoyijie": {
		Username: "huoyijie",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
	},
}

// 获取密钥
func getSecretKey() []byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78" /* Load key from somewhere, for example an environment variable */)
	if err != nil {
		log.Fatal(err)
	}
	return key
}

// 采用对称加密签名算法，生成 JWT Token
func generateToken(username string) (token string, err error) {
	claims := TokenClaims{
		username,
		jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			Issuer:    "user-auth-with-jwt-demo",
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, &claims)
	token, err = t.SignedString(getSecretKey())
	return
}
```

编辑 main 方法，添加 signin 接口

```go
// main.go
func main() {
	// ...
	r.POST("signin", func(c *gin.Context) {
		form := &SigninForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		decode := func(passwordHash string) (bytes []byte) {
			bytes, _ = base64.StdEncoding.DecodeString(passwordHash)
			return
		}

		// 验证用户存在且密码哈希比对成功
		if user, found := users[form.Username]; !found || bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(form.Password)) != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10001,
				Message: "用户或密码错误",
			})
			return
		} else if token, err := generateToken(user.Username); err != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10002,
				Message: "生成 Token 失败",
			})
			return
		} else {
			c.JSON(http.StatusOK, Result{
				Data: token,
			})
		}
	})
	// ...
}
```

启动服务器发送测试请求

```bash
$ go mod tidy
# 运行应用
$ go run .
# 发送登录请求，成功返回 JWT Token
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh1b3lpamllIiwiaXNzIjoidXNlci1hdXRoLXdpdGgtand0LWRlbW8iLCJleHAiOjE2ODc2MTExNDR9.CmjCuqM80vlK5RmhnQwNtB1qRp4hTkopV5QxfhdQF4o"}

# 通过在线 base64 解码工具解码上面 token 的中间 JSON Object 部分，结果如下:
# {"username":"huoyijie","iss":"user-auth-with-jwt-demo","exp":1687611144}
```

可以看到已成功返回 JWT Token。客户端可以把 Token 写入 Cookie 或 localStorage。后面的请求可以通过 Cookie 或 Header 携带 Token 信息。然后服务器可通过拦截器实现 Token 自动认证。

```go
// main.go
// token 认证拦截器
func tokenAuth(c *gin.Context) {
	auth := c.GetHeader("Authorization")
	// 未设置认证信息
	if len(auth) == 0 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	t := strings.Split(auth, " ")
	// 认证信息格式不正确，正确格式如下
	// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh1b3lpamllIiwiaXNzIjoidXNlci1hdXRoLXdpdGgtand0LWRlbW8iLCJleHAiOjE2ODc2MTExNDR9.CmjCuqM80vlK5RmhnQwNtB1qRp4hTkopV5QxfhdQF4o
	if len(t) != 2 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	// 解析 Token
	token, err := jwt.ParseWithClaims(t[1], &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return getSecretKey(), nil
	})

	// Token 解析出错或过期
	if err != nil || !token.Valid {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	if claims, ok := token.Claims.(*TokenClaims); !ok {
		c.AbortWithStatus(http.StatusUnauthorized)
	} else {
		// Token 认证成功，设置上下文信息
		c.Set("username", claims.Username)
	}
}
```

编辑 main 方法，增加需要登录才能访问的接口 `/private`

```go
func main() {
	// ...
	// private 接口配置了 tokenAuth 拦截器，拦截器会自动进行 Token 认证，
	// 认证成功会把 username 写入上下文中，认证失败会返回 401
	r.GET("private", tokenAuth, func(c *gin.Context) {
		username := c.GetString("username")
		c.JSON(http.StatusOK, Result{
			Data: username,
		})
	})
	// ...
}
```

现在运行服务器，发送测试请求

```bash
$ go mod tidy
# 运行应用
$ go run .

# 未携带 Token，则返回 401
$ curl -f http://localhost:8080/private
curl: (22) The requested URL returned error: 401

# 登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh1b3lpamllIiwiaXNzIjoidXNlci1hdXRoLXdpdGgtand0LWRlbW8iLCJleHAiOjE2ODc2MTIzMDJ9.pth8BFddyFtmGWPIUWK-_bAEwpmivr50nS16Z5muMXk"}

# 携带刚刚登录接口返回的 Token，接口成功返回 username
$ curl -f -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh1b3lpamllIiwiaXNzIjoidXNlci1hdXRoLXdpdGgtand0LWRlbW8iLCJleHAiOjE2ODc2MTIzMDJ9.pth8BFddyFtmGWPIUWK-_bAEwpmivr50nS16Z5muMXk' http://localhost:8080/private
{"code":0,"data":"huoyijie"}
```