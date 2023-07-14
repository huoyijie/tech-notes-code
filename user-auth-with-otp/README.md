# 基于 TOTP 实现多因素(Multi-factor)认证

本文介绍了基于 TOTP 实现多重身份认证的基本流程和方法，并基于 [Golang OTP 库](https://github.com/pquerna/otp) 和 [Google Authenticator 客户端](https://github.com/google/google-authenticator) 实现了多重身份认证实例项目，当用户主动开启动态密码后，必须通过双重身份认证才会授权用户访问数字资源。为了防止恶意用户通过暴力手段破解动态密码，我们应该对登录接口进行更严格的访问限制，如连续认证失败多次后锁定账户一段时间(放到后文实现)。可以看到我们通过实施双重身份认证，有效降低了由于密码泄漏导致的安全风险。

数字安全在当今世界至关重要，每个用户都在网上存储各种敏感信息，这些在线信息的泄露或滥用可能会在现实世界中造成严重后果，例如财务盗窃、业务中断和隐私泄露。

虽然密码可以保护数字资产，但仅仅有密码是不够的。黑客通过发现一个密码，就有可能获得重复使用该密码的多个网站账户的访问权限。多重身份验证作为额外的安全层，即使密码被盗，也可以防止未经授权的用户访问这些账户。

## 多因素(Multi-factor)认证

[多重要素验证](https://zh.wikipedia.org/zh-cn/%E5%A4%9A%E9%87%8D%E8%A6%81%E7%B4%A0%E9%A9%97%E8%AD%89)，或称多因子认证、多因素验证、多因素认证，是一种资源访问控制的方法，用户要通过两种以上的认证机制之后，才能得到授权，使用资源。这种认证方式可以提高安全性。例如，用户要输入PIN码，插入银行卡，最后再经指纹比对，通过这三种认证方式，才能获得授权。

## OTP/HOTP/TOTP

- OTP (One-time Password)

[OTP](https://zh.wikipedia.org/zh-cn/%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A2%BC)  是一次性密码，又称动态密码或单次有效密码，是指计算机系统或其他数字设备上只能使用一次的密码，有效期为只有一次登录会话或交易。

- HOTP (HMAC-based One-time Password)

[HOTP](https://zh.wikipedia.org/zh-cn/%E5%9F%BA%E4%BA%8E%E6%95%A3%E5%88%97%E6%B6%88%E6%81%AF%E9%AA%8C%E8%AF%81%E7%A0%81%E7%9A%84%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A0%81%E7%AE%97%E6%B3%95) 是一种基于散列消息验证码（HMAC）的一次性密码算法。

- TOTP (Time-based One-Time Password)

[TOTP](https://zh.wikipedia.org/zh-cn/%E5%9F%BA%E4%BA%8E%E6%97%B6%E9%97%B4%E7%9A%84%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A0%81%E7%AE%97%E6%B3%95) 是一种根据预共享的密钥与当前时间计算一次性密码的算法。它已被互联网工程任务组接纳为RFC 6238标准，成为主动开放认证（OATH）的基石，并被用于众多多重要素验证系统当中。

TOTP基于HOTP实现，它结合一个私钥与当前时间戳，使用一个密码散列函数来生成一次性密码。由于网络延迟与时钟不同步可能导致密码接收者不得不尝试多次遇到正确的时间来进行身份验证，时间戳通常以30秒为间隔，从而避免反复尝试。

## OTP 实现

[Golang OTP 实现](https://github.com/pquerna/otp)

## 多重要素(Multi-factor)认证实例

文中所有代码已放到 [Github user-auth-with-otp](https://github.com/huoyijie/tech-notes-code) 目录下。OAuth2 部分代码主要来自 [auth-with-oauth2](https://huoyijie.cn/docsifys/Tech-Notes/auth-with-oauth2) 这篇文章，本文主要介绍 OTP 相关实现，OAuth2 部分会省略。

*前置条件*

* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）

创建 user-auth-with-otp 项目

```bash
$ mkdir user-auth-with-otp && cd user-auth-with-otp
$ go mod init user-auth-with-otp
```

**实现 OAuth2 Authorization Server**

创建 oauth2.go 文件，并添加下面代码:

```go
// 用户模型
type User struct {
	Username     string
	PasswordHash string
	OTPKey       *otp.Key
}

// 模拟数据库存储，真实应用需写入数据库表中
var users = map[string]*User{
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

// 获取用来生成 JWT Token 的密钥
func getSecretKey() []byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78" /* Load key from somewhere, for example an environment variable */)
	if err != nil {
		log.Fatal(err)
	}
	return key
}
```

注意 `User.OTPKey` 字段，存放用来为该用户生成或验证动态密码 OTP 的密钥配置。如果该字段不为空，则认为当前用户启用了 OTP 动态密码登录(默认关闭)。接下来定义 oauth2 server 启动方法:

```go
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
}
```

**实现 OAuth2 Client**

创建 app.go，并添加如下代码:

```go
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
```

上述代码主要定义了 runApp 方法，并在其中定义了 `/signin` 和 `/enable_otp` 两个接口。

初次登录时，默认用户是关闭动态密码 OTP 的(User.OTPKey == nil)，此时只进行密码验证。

密码登录验证成功后会返回 access_token，用户此时可选择是否开启动态密码。如果要开启动态密码，可以访问 `/enable_otp` 接口并携带 access_token 参数。`/enable_otp` 接口会判断当前账号是否有 OTPKey，如果没有 OTPKey 则生成新的随机密钥和默认配置。然后把密钥及配置转换成 png 格式的二维码并返回。

用户可以在手机应用市场里搜索 Google Authenticator 并安装，然后扫描上述二维码完成客户端账号设置。此时，Google Authenticator 开始显示该账号的动态密码。

由于当前开启了动态密码，下次登录时除了填写用户名、密码之外，也要填写 Google Authenticator 上实时显示的动态密码。可以看到下面登录表单增加了 `OTP` 字段用来接收可选的动态密码。

```go
// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
	OTP      string `json:"otp"`
}
```

注意 `/signin` 中下面这段代码，当用户提交用户名、密码及动态密码后，登录接口先比对用户名和密码，再判断如果当前用户开启了动态密码，则调用 `totp.Validate` 进行验证。

```go
// ...
// 如果开启 OTP 多因子认证
if u := users[form.Username]; u.OTPKey != nil && !totp.Validate(form.OTP, u.OTPKey.Secret()) {
  // OTP 一次性密码错误
  c.JSON(http.StatusOK, Result{
    Code:    "-10010",
    Message: "Invalid OTP",
  })
  return
}
// ...
```

只有密码和动态密码双重身份认证全部成功，才会下发 access_token 给客户端。注意为了防止恶意用户通过暴力手段破解动态密码，应该对登录接口进行更严格的访问限制。如连续认证失败多次后锁定账户一段时间。

```go
// ...
r.GET("/enable_otp", tokenAuth, func(c *gin.Context) { // ...
// ...
```

如果仔细看 `/enable_otp` 接口，还配置了 `tokenAuth` 拦截器。换句话说，要先登录后才能开启动态密码。

```go
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
```

tokenAuth 拦截器主要是用来验证 access_token 是否有效，它优先读取 url 中 query string 中的参数，再读取 header 中的 Authorization。读取到 access_token 后调用 oauth2 server 中的 `/oauth/validate_token` 接口进行验证。验证失败返回 401，验证成功把 username 写入上下文中。

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

    log.Fatal(r.Run(":8080"))
}
```

运行 `go mod tidy` 安装依赖

```bash
# 安装依赖
$ go mod tidy
```

如果代码报 `e.ErrorCode undefined (type *"golang.org/x/oauth2".RetrieveError has no field or method ErrorCode
` 错误，手动编辑 go.mod 调整 oauth2 client 库版本为 v0.9.0

```
require (
-    golang.org/x/oauth2 v0.0.0-20200107190931-bf48bf16ab8d
+    golang.org/x/oauth2 v0.9.0
)
```

然后再次执行 go mod tidy，报错消失。接下来我们测试一下整个流程。

```bash
# 运行应用
$ go run .

# 密码登录认证 (默认未开启动态密码)
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODg0ODYwMTAsInN1YiI6Imh1b3lpamllIn0.Ac1CW7WgVCyoM-HgqLfUpxF2caXizuu5Bq5UwHsU6qrN5PaKGOh9ahD1BD8GyGtAM9NuonpmiF1kAaMcpfgtVw","token_type":"Bearer","refresh_token":"ZTE0MDE0NDITNTE3MC01YZHMLTG0NDATMTVKOGYXZJAXOTQ1","expiry":"2023-07-04T23:53:30.050751945+08:00"}}
```

打开浏览器，地址栏输入 `http://localhost:8080/enable_otp?access_token=eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODg0ODYwMTAsInN1YiI6Imh1b3lpamllIn0.Ac1CW7WgVCyoM-HgqLfUpxF2caXizuu5Bq5UwHsU6qrN5PaKGOh9ahD1BD8GyGtAM9NuonpmiF1kAaMcpfgtVw`，服务器返回二维码图片。

![Enable OTP](https://cdn.huoyijie.cn/uploads/2023/07/enable-otp.png)

在手机上打开应用市场搜索 Google Authenticator。

![Search google authenticator](https://cdn.huoyijie.cn/uploads/2023/07/search-google-authenticator.jpg)

点安装并打开

![Install google authenticator](https://cdn.huoyijie.cn/uploads/2023/07/install-google-authenticator.jpg)

依次点击添加动态密码 > 扫描二维码，完成账号设置。

![Scan QRCode](https://cdn.huoyijie.cn/uploads/2023/07/scan-qrcode.jpg)

可以看到上面已经开始显示动态密码了。当前用户在开启动态密码后，下次登录时必须要提交动态密码，否则无法认证成功。我们现在测试一下动态密码:

```bash
# 开启动态密码后，未传动态密码进行登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":"-10010","message":"Invalid OTP"}
```

看上面输出，即使输入了正确的用户名和密码，如果缺失动态密码，无法通过身份认证。现在打开 Google Authenticator 查看动态密码。

![One-time Password](https://cdn.huoyijie.cn/uploads/2023/07/one-time-password.jpg)

```bash
# 此时 Google Authenticator 显示 `294032`
$ curl -d '{"username":"huoyijie","password":"mypassword","otp":"294032"}'  http://localhost:8080/signin
{"code":"","data":{"access_token":"eyJhbGciOiJIUzUxMiIsImtpZCI6Imp3dCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMDAwMDAiLCJleHAiOjE2ODg0ODY5NTgsInN1YiI6Imh1b3lpamllIn0.LH0hLmnr293DpN_dtSdStzu6tQk-g5lMTg3EzE3NpG18_8ZcYh19TRB-YrYts9CtUpEdXGXKZREkOHq_Rr9mwQ","token_type":"Bearer","refresh_token":"ZJLMOTG1YMETMDU4MC01MZIZLTG4OTATZJRKMDEZZDCZY2JI","expiry":"2023-07-05T00:09:18.360268303+08:00"}}
```

可以看到输入实时的动态密码后，通过了密码、动态密码双重身份认证，成功返回了 access_token 等信息。

本文介绍了基于 TOTP 实现多重身份认证的基本流程和方法，并基于 [Golang OTP 库](https://github.com/pquerna/otp) 和 [Google Authenticator 客户端](https://github.com/google/google-authenticator) 实现了多重身份认证实例项目，当用户主动开启动态密码后，必须通过双重身份认证才会授权用户访问数字资源。为了防止恶意用户通过暴力手段破解动态密码，我们应该对登录接口进行更严格的访问限制，如连续认证失败多次后锁定账户一段时间(放到后文实现)。可以看到我们通过实施双重身份认证，有效降低了由于密码泄漏导致的安全风险。