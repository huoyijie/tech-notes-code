# 基于 OAuth2 Password Grant 实现用户认证

用户认证和授权可以保护服务器接口，保障服务器和用户数据安全，是非常重要的安全基础。但是开发一个安全的用户认证授权流程不是件容易的事情，如果考虑不周或者代码实现有漏洞，很容易被黑客针对攻击。很多大的互联网平台(如 Google、微信)等，在用户认证授权方面积累了非常多的最佳实践经验，他们纷纷对第三方提供了身份认证服务，一般都遵循 OAuth 协议。选择接入这些大平台的身份认证服务，可以简化安全方面的工作，把主要精力投入到业务开发工作中。

## OAuth2

[OAuth 2.0](https://oauth.net/2/) 是第三方认证授权的工业级标准协议，旨在简化 Web 应用、桌面应用、移动应用和其他智能设备的特定的用户认证授权开发流程。

```
+--------+                               +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |                               |     Owner     |
|        |<-(B)-- Authorization Grant ---|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C)-- Authorization Grant -->| Authorization |
| Client |                               |     Server    |
|        |<-(D)----- Access Token -------|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E)----- Access Token ------>|    Resource   |
|        |                               |     Server    |
|        |<-(F)--- Protected Resource ---|               |
+--------+                               +---------------+

                Figure 1: Abstract Protocol Flow
```

OAuth 协议定义了4种角色:

* Resource Owner

资源拥有者，终端用户

* Resource server

平台资源服务器，接受携带 Access Token 的请求并返回受保护的资源数据(如: 获取用户信息、订单信息等)

* Client

准备接入平台身份认证服务的第三方应用程序，获得终端用户授权后，可以通过 Access Token 向资源服务器发送资源请求

* Authorization server

平台身份认证服务提供的授权服务器，在认证用户和获取用户授权后，为 Client 发放 Access Token

OAuth 协议主要流程:

Client 应用中登录界面显示其他平台(如: Google)登录选项，用户点击跳转至 Google 登录页面，输入 Google 用户名密码进行认证，通过后会打开授权页面，显示 Client 应用申请访问用户的某些资源(如: 用户资料)，用户点击授权后会返回到 Client 应用，Client 在得到授权后可从 Authorization server 获取 Access Token，最后通过 Access Token 可以从 Resource server 获取用户资料。此时，Client 可为用户创建账户并登录。

## OAuth2 Password Grant

本文主旨不在于介绍上述 OAuth 的主要使用场景，而是想介绍一个 OAuth 协议不太推荐的遗存的认证授权方式，即通过用户名密码直接获取 Access Token。主要流程是 Client 应用提供登录页面，收集用户用户名、密码，然后提交至 authorization server，后者完成认证后直接返回 Access Token 给 Client 应用程序。**Client 应用可以接触到用户名、密码**，是这种方式不被推荐的原因，除非 Client 被高度信任(如: Client 为 iOS 操作系统)，否则不应该使用这种方式。

有一种情况比较适合 OAuth2 Password Grant，就是 Client、Resource server、Authorization server 都属于同一个应用本身，此时 Client 是可信任的。

```
+----------+
| Resource |
|  Owner   |
|          |
+----------+
    v
    |    Resource Owner
    (A) Password Credentials
    |
    v
+---------+                                  +---------------+
|         |>--(B)---- Resource Owner ------->|               |
|         |         Password Credentials     | Authorization |
| Client  |                                  |     Server    |
|         |<--(C)---- Access Token ---------<|               |
|         |    (w/ Optional Refresh Token)   |               |
+---------+                                  +---------------+

      Figure 2: Resource Owner Password Credentials Flow
```

Client 在获取到 Access Token 后，可携带 Access Token 访问 Resource server。下面我们来看看如何基于 [go-oauth2 server](https://github.com/go-oauth2/oauth2) 和 [oauth2 client](https://pkg.go.dev/golang.org/x/oauth2) 实现这种用户认证方式。

## 实现用户认证

文中所有代码已放到 [Github user-auth-with-oauth2](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*
* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）

创建 user-auth-with-oauth2 项目

```bash
$ mkdir user-auth-with-oauth2 && cd user-auth-with-oauth2
$ go mod init user-auth-with-oauth2
```

**实现 OAuth2 Authorization Server**

创建 oauth2.go 文件，并添加下面代码

```go
package main

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/go-oauth2/oauth2/v4/models"
	"github.com/go-oauth2/oauth2/v4/errors"
	"github.com/go-oauth2/oauth2/v4/generates"
	"github.com/go-oauth2/oauth2/v4/manage"
	"github.com/go-oauth2/oauth2/v4/server"
	"github.com/go-oauth2/oauth2/v4/store"
	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

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

func decode(passwordHash string) (bytes []byte) {
	bytes, _ = base64.StdEncoding.DecodeString(passwordHash)
	return
}

// 获取密钥
func getSecretKey() []byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78" /* Load key from somewhere, for example an environment variable */)
	if err != nil {
		log.Fatal(err)
	}
	return key
}

// 启动 oauth2 server
func runOAuth2(r *gin.Engine) {
	manager := manage.NewDefaultManager()
	// token memory store
	manager.MustTokenStorage(store.NewMemoryTokenStore())
	// generate jwt access token
	manager.MapAccessGenerate(generates.NewJWTAccessGenerate("jwt", getSecretKey(), jwt.SigningMethodHS512))

	// client memory store
	clientStore := store.NewClientStore()
	clientStore.Set("100000", &models.Client{
		ID:     "100000",
		Secret: "575f508960a9415a97f05a070a86165b",
	})
	manager.MapClientStorage(clientStore)

	// 设置 oauth2 server
	srv := server.NewDefaultServer(manager)

	srv.SetInternalErrorHandler(func(err error) (re *errors.Response) {
		log.Println("Internal Error:", err.Error())
		return
	})
	srv.SetResponseErrorHandler(func(re *errors.Response) {
		log.Println("Response Error:", re.Error.Error())
	})

	// 用户认证
	srv.SetPasswordAuthorizationHandler(func(ctx context.Context, clientID, username, password string) (userID string, err error) {
		if clientID == "100000" {
			// 验证用户存在且密码哈希比对成功
			if user, found := users[username]; found && bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(password)) == nil {
				userID = username
				return
			}
		}
		err = errors.ErrUnauthorizedClient
		return
	})

	// 返回 token
	r.POST("/oauth/token", func(c *gin.Context) {
		srv.HandleTokenRequest(c.Writer, c.Request)
	})
}
```

主要看负责启动 oauth2 server 的 runOAuth2 方法，代码首先创建 manager，设置基于内存的 Token Storage，设置生成 JWT 格式的 Access Token，然后设置基于内存的 Client 信息存储，预先配置了一个 ID 为 100000 的 Client，只有这里配置过的 Client 才可以通过 oauth2 server 获取 Access Token。

基于内存存储 Token 和 Client 信息容易设置，非常方便用来开发和测试，但是重启进程数据就没了，实践中可以采用插件替换为基于数据库或 Redis 的方案，具体参见[go-oauth2](https://github.com/go-oauth2/oauth2)。

设置完 manager 后，基于 manager 创建 srv，设置错误处理回调函数，设置用户名密码认证回调函数。用户认证回调函数首先判断 clientID 等于 100000，然后比对用户名和密码哈希，认证成功返回 userID，认证失败返回 error。

最后配置路由 `/oauth/token`，完全接管生成 Token 的请求。

运行 `go mod tidy` 安装依赖:

```bash
$ go mod tidy
```

**实现 OAuth2 Client**

创建 app.go，并添加如下代码:

```go
package main

import (
	"context"
	"net/http"

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

		c.JSON(http.StatusOK, Result{Data: token})
	})
}
```

这段代码定义了 config 变量，通过 oauth2 server 预先配置的 Client 访问 Authorization server，然后是最重要的 runApp 函数，定义了登录 Signin 接口，调用 [oauth2 client](https://pkg.go.dev/golang.org/x/oauth2) 库提供的 PasswordCredentialsToken 方法，使用用户名密码交换 Token。PasswordCredentialsToken 方法会向 oauth2 Authorization server 发送类似如下请求:

```
POST /oauth/token HTTP/1.1
 
grant_type=password
&username=huoyijie
&password=mypassword
&client_id=100000
&client_secret=575f508960a9415a97f05a070a86165b
```

oauth2 Authorization server 会验证 client_id & client_secret 是否合法，调用下面预先配置好的回调函数进行用户名密码认证。

```go
// oauth2.go
func runOAuth2(r *gin.Engine) {
  // ...
	// 用户认证
	srv.SetPasswordAuthorizationHandler(func(ctx context.Context, clientID, username, password string) (userID string, err error) {
		if clientID == "100000" {
			// 验证用户存在且密码哈希比对成功
			if user, found := users[username]; found && bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(password)) == nil {
				userID = username
				return
			}
		}
		err = errors.ErrUnauthorizedClient
		return
	})
	// ...
}
```

认证成功后，会返回 Token 给 oauth client。

```bash
# 安装依赖
$ go mod tidy
```

```
e.ErrorCode undefined (type *"golang.org/x/oauth2".RetrieveError has no field or method ErrorCode
```

如果代码报上述错误，手动编辑 go.mod 调整 oauth2 client 库版本为 v0.9.0

```
require (
-	golang.org/x/oauth2 v0.0.0-20200107190931-bf48bf16ab8d
+	golang.org/x/oauth2 v0.9.0
)
```

然后再次执行 `go mod tidy`，报错消失。

**实现 main 函数**

新增 main.go，并添加下面代码

```go
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
```

下面我们来测试一下:

```bash
# 运行应用
$ go run .

# 发送登录请求
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc3NTY2NjAsInN1YiI6Imh1b3lpamllIn0.BoFdJkGsHDN0wzli8zfIux7XckrSR4BHEtd5wxzRZ3iX87VuaWXOXNkUqqPwHJqOTEwfXJWEAvFZCe54orXGdg","token_type":"Bearer","refresh_token":"MMVHMDHHOWYTNDRLYY01YZHMLWI2MWMTMDQYMZC4MDK5NDRL","expiry":"2023-06-26T13:17:40.921345574+08:00"}}
```

我们选择了 JWT 格式的 Access Token，JWT 格式由 Header (签名算法参数)、JSON Object 和签名三部分组成，前2个部分可通过 base64 解码直接查看:

```
{"alg":"HS512","kid":"jwt","typ":"JWT"}{"aud":"100000","exp":1687756660,"sub":"huoyijie"}
```

其中 aud 为 Client ID (100000)，exp 是过期时间，sub 是 userID。返回的 Token 信息除了 access_token，还包括 token_type(Bearer)、refresh_token 和 expiry。前端应用在通过 /signin 接口拿到 token 信息后可写入本地存储中。访问后续接口资源时，需在 Header 中携带 `Authorization: Bearer $access_token`，资源服务器会对 access_token 进行是否合法、过期验证。接下来实现一个拦截器，自动读取并校验请求头部的 access_token。

**Token 认证拦截器**

Token 是由 oauth2 server 使用密钥和对称加密算法签名生成的，没有密钥无法验证签名。因此，Token 验证请求还是要委托给 oauth2 server，编辑 oauth2.go 增加 Token 验证接口。

```go
// oauth2.go
func runOAuth2(r *gin.Engine) {
	// ...
	// 验证 access token
	r.GET("/oauth/validate_token", func(c *gin.Context) {
		if token, err := srv.ValidationBearerToken(c.Request); err != nil {
			res := gin.H{"err_desc": err.Error()}
			switch err {
			case errors.ErrInvalidAccessToken:
				res["err_no"] = "-1001"
			case errors.ErrExpiredAccessToken:
				res["err_no"] = "-1002"
			case errors.ErrExpiredRefreshToken:
				res["err_no"] = "-1003"
			default:
				res["err_no"] = "-1000"
			}
			c.JSON(http.StatusOK, res)
		} else {
			c.JSON(http.StatusOK, gin.H{
				"err_no":    "0",
				"client_id": token.GetClientID(),
				"user_id":   token.GetUserID(),
			})
		}
	})
	// ...
}
```

编辑 app.go，增加 tokenAuth 拦截器代码

```go
// app.go
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
```

上述代码是一个请求拦截器，对于需要 access_token 才能访问接口，可以配置上述拦截器。拦截器主要通过调用 oauth2 server 中的 `/oauth/validate_token` 接口来实现 Token 有效性验证。

* 如果 `/oauth/validate_token` 接口不能访问，返回 http.StatusInternalServerError(500)。
* 如果验证无效会返回 http.StatusUnauthorized(401)，具体错误(如: access_token 或 refresh_token 过期)通过 Code 返回。客户端可根据错误码来执行不同的操作，access_token 过期则进行刷新 Token 操作，refresh_token 过期则跳转至登录页面重新认证。
* 如果验证成功，则把 username 写入请求上下文中。

接下来通过 `/private` 接口测试一下上述拦截器，编辑 app.go 文件，添加下述代码:

```go
// app.go
func main runApp(r *gin.Engine) {
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

下面来测试一下 `/private` 接口:

```bash
$ go mod tidy

# 运行应用
$ go run .

# 未携带 access_token 访问 /private 接口返回 401
$ curl -f http://localhost:8080/private
curl: (22) The requested URL returned error: 401

# 登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc4NTQ0NTQsInN1YiI6Imh1b3lpamllIn0.HTyLCx3KgqJIDp7huQyV1AgHmjI_oJZG05mZYZOpYNm_BmGGIHBAboDwTsP_pCiA_EgEm_MVsoI9q5fZoYldXA","token_type":"Bearer","refresh_token":"MZVLOGQZYMETMMJHYY01M2YYLTHLZGUTMWIXMMI2NZG4YJK1","expiry":"2023-06-27T16:27:34.549579677+08:00"}}

# 携带刚刚生成的 access_token 访问 /private 接口返回 username
$ curl -f -H 'Authorization: Bearer eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc4NTQ0NTQsInN1YiI6Imh1b3lpamllIn0.HTyLCx3KgqJIDp7huQyV1AgHmjI_oJZG05mZYZOpYNm_BmGGIHBAboDwTsP_pCiA_EgEm_MVsoI9q5fZoYldXA'  http://localhost:8080/private
{"code":"","data":"huoyijie"}
```

**刷新 Access Token**

为了安全一般 access_token 有效时间一般比较短 (默认2小时)，当 access_token 过期后验证会失败，客户端收到 401 错误后检测具体错误码，如果是 access_token 过期，则可以通过 refresh_token 重新生成 access_token。

refresh_token 在通过用户名、密码认证后，会与 access_token 一起下发给客户端，客户端需妥善保管(只有在需要刷新 access_token 时才用到)，一般可以设置更长的有效期(如: 7天)。

在使用 refresh_token 刷新 Token 时，生成新的 access_token 的同时，也会生成新的 refresh_token，客户端需要更新本地存储的 refresh_token。新的 refresh_token 生成后，原有的 refresh_token 就立刻失效了。

下面来实现 Token 刷新接口，编辑 app.go 文件，添加下面代码:

```go
// 刷新 token 表单
type RefreshForm struct {
	AccessToken string `json:"access_token" binding:"required"`

	RefreshToken string `json:"refresh_token,omitempty" binding:"required"`
}

func runApp(r *gin.Engine) {
	// ...
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
	// ...
}
```

下面来发送请求测试一下 `/refresh` 接口:

```bash
$ go mod tidy

# 运行应用
$ go run .

# 登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
# 输出:
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc4NTY2NzAsInN1YiI6Imh1b3lpamllIn0.7MmVBHjiRdsom6sLvpseRyfojR6AIG9K9OwxSBH_tocjFJfft8AJ9HfhYIWtcE9jaPs3uysqBRRdXv9fUyJ6ng","token_type":"Bearer","refresh_token":"NZRJOGY5ZDQTOWMXNY01NJZMLTLHZMMTNDYZYMMWOWQ1ZMMZ","expiry":"2023-06-27T17:04:30.979470401+08:00"}}

# 用刚刚生成的 refresh_token 刷新 Token
$ curl -d '{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc4NTY2NzAsInN1YiI6Imh1b3lpamllIn0.7MmVBHjiRdsom6sLvpseRyfojR6AIG9K9OwxSBH_tocjFJfft8AJ9HfhYIWtcE9jaPs3uysqBRRdXv9fUyJ6ng", "refresh_token":"NZRJOGY5ZDQTOWMXNY01NJZMLTLHZMMTNDYZYMMWOWQ1ZMMZ"}' -f http://localhost:8080/refresh
# 输出:
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODc4NTY4MzUsInN1YiI6Imh1b3lpamllIn0.Af0xxj-zKvhixoq4WDyreyCl-hpYMYSKW-d_ZwRa2lhs0YZnsDSCNwarIYvHs4Q0dF-QDwxz1W6wZ-arIRwxNw","token_type":"Bearer","refresh_token":"ZWE4MDAYOGETM2Y1NY01NGJHLTGZOTATM2UYNTNHMWNLMZC2","expiry":"2023-06-27T17:07:15.469488185+08:00"}}
```

可以看到 `/refresh` 接口成功生成了新的 Token。