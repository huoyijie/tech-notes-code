# 用户认证授权

## 用户身份识别

除非网站上所有的数据和功能都是公开的，否则你一定会需要用户、角色和权限系统。不同的用户会有不同的权限，你需要识别出请求来自哪个用户。

想对用户请求进行识别，就需要前端在向服务器发送请求时携带的身份标识信息，一般均采用 Token 机制来实现，通过 Cookie/Header 发送。Token 可以是通过对称密钥加密的，也可以是采用私钥签名的。主要目的是阻止第三方伪造 Token 以其他用户身份访问网站。

* 对称加密

```
Token = 对称加密([用户ID,时间戳...], 密钥)
```

密钥是保密的，只存在于服务器上，Token 的生成与解析由服务器负责，客户端也无法解密 Token。Token 中通常只有 userId 和 timestamp。

* 非对称加密 (JWT)

```
Identify = base64.encode([用户ID,时间戳...])
Token = Identify + 签名(哈希(Identify), 私钥)
```

私钥是保密的，只存在于服务器上，Token 的生成由服务器负责，通常由原始用户身份信息 Identify 和签名两部分组成，用户身份 JSON 字符串，通过 base64 算法进行编码作为 Identify，由于 Identify 长度不固定，可用与客户端约定好的哈希算法进行运算，再用私钥进行签名。

这种方法生成的 Token 并不是加密的，客户端甚至第三方拿到 Token 后都可以解析出其中的用户身份信息。

客户端持有相对应的公钥，可对 Token 进行签名验证，验证此 Token 是否是具有私钥的服务器生成的，并可以从 Token 中解析出原始用户信息。Token 可携带很多用户信息，甚至可包含用户角色权限等信息。

```
[Identify, signature] = split(Token)
签名验证(哈希(Identify), signature, 公钥)
[用户ID,时间戳...] = base64.decode(Identify)
```

对称加解密、非对称加解密、签名、哈希等算法都属于密码学范畴，之前有介绍过 Golang 语言的各种密码学方法。[密码学方法](https://huoyijie.cn/gitbooks/writing-a-cloud-encrypting-file-system-with-golang-and-FUSE/latest/crypto.html)

* 随机生成 UUID 作为 Token

还有一种方法是随机生成 UUID 作为 Token，但是为了防止第三方伪造，需要服务器端保存所有有效的 Token 集合。服务器再接收到请求中携带的 Token 后需要进行有效性验证。

## 用户认证

用户认证的原理在于要求你输入只有你自己知道的秘密信息（如用户名、密码），并由服务器进行校验。一般在登录前要先注册用户账号。注册时需要提供用户名和密码，密码提交到服务器后，确保所有中间服务器不记录、不打印日志，并经过 bcrypt 哈希后再存储于数据库中。为了最大程度上保护用户密码，服务器绝对不要保存用户原始密码。注册成功后可以向服务器发送登录请求，服务器收到提交数据，并与数据库中存储的用户名、密码哈希进行比对，以确定认证是否成功，认证成功后下发 Token。

### 用户认证实例

文中所有代码已放到 [Github user-auth](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*
* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）

```bash
$ go version
go version go1.20.1 linux/amd64

$ mkdir user-auth && cd user-auth
$ go mod init user-auth
$ touch main.go
```

编辑 main.go 文件

```go
// main.go
package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.Writer.WriteString("Hello, world!")
	})
	r.Run("0.0.0.0:8080")
}
```

本实例采用 web 框架 Gin，运行 `go mod tity` 自动下载安装依赖
```bash
$ go mod tidy
```

执行 main.go，并通过浏览器访问 `http://localhost:8080`，浏览器会输出 `Hello, world!`。

为了让代码更容易理解，本实例进行了简化处理，不依赖数据库，注册用户数据放入内存 map 中（注：本实例不支持并发注册和登录，并发的情况下会出错）。

编辑 main.go 添加如下代码:

```go
// main.go
// 统一返回包装类型
type Result struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// 注册表单
type SignupForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

// 用户模型
type User struct {
	Username, PasswordHash string
}

// 模拟数据库存储，读写 map 未加锁，不支持并发注册登录
var users = map[string]User{}
```

然后修改 main 方法，添加如下代码:

```go
// main.go
func main() {
	// ...
	r.POST("signup", func(c *gin.Context) {
		form := &SignupForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		// check username unique
		if _, found := users[form.Username]; found {
			c.JSON(http.StatusOK, Result{
				Code:    -10000,
				Message: "用户已存在",
			})
			return
		}

		// calc password bcrypt hash bytes
		passwordHashBytes, err := bcrypt.GenerateFromPassword([]byte(form.Password), 14)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		// base64 encode
		passwordHash := base64.StdEncoding.EncodeToString(passwordHashBytes)

		user := User{
			form.Username,
			passwordHash,
		}
		// 日志仅供调试
		fmt.Println("user:", user)

		// write new user to storage
		users[user.Username] = user
		// 日志仅供调试
		fmt.Println("users:", users)

		c.JSON(http.StatusOK, Result{
			Data: form.Username,
		})
	})
	// ...
}
```

可以看到代码中先对密码进行了 bcrypt 哈希，然后进行 base64 编码才写入存储。换句话说，服务器不会保存用户原始密码，也没有任何办法可以通过密码哈希值逆向得到。注册成功后会返回用户名。

运行 `go mod tity` 自动下载安装依赖，然后通过命令 `curl -d '{"username":"huoyijie","password":"mypassword"}' http://localhost:8080/signup` 发送注册请求。


新增 token.go 文件，存放生成与解析 Token 相关方法。

```go
// token.go
package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"io"
	"log"
	"time"
)

func GetSecretKey() *[32]byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78")
	if err != nil {
		log.Fatal(err)
	}
	return (*[32]byte)(key)
}

func NewGCM(key *[32]byte) (gcm cipher.AEAD, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return
	}
	gcm, err = cipher.NewGCM(block)
	return
}

func randNonce(nonceSize int) []byte {
	nonce := make([]byte, nonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		panic(err)
	}
	return nonce
}

func Encrypt(plaintext []byte, gcm cipher.AEAD) []byte {
	// 随机生成字节 slice，使得每次的加密结果具有随机性
	nonce := randNonce(gcm.NonceSize())
	// Seal 方法第一个参数 nonce，会把 nonce 本身加入到加密结果
	return gcm.Seal(nonce, nonce, plaintext, nil)
}

func Decrypt(ciphertext []byte, gcm cipher.AEAD) ([]byte, error) {
	// 首先得到加密时使用的 nonce
	nonce := ciphertext[:gcm.NonceSize()]
	// 传入 nonce 并进行数据解密
	return gcm.Open(nil, nonce, ciphertext[gcm.NonceSize():], nil)
}

// 应该用 User ID 生成 Token
func GenerateToken(username string) (token string, err error) {
	gcm, err := NewGCM(GetSecretKey())
	if err != nil {
		return
	}

	bytes := make([]byte, len(username)+8)
	binary.BigEndian.PutUint64(bytes, uint64(time.Now().Unix()))
	copy(bytes[8:], []byte(username))
	token = base64.StdEncoding.EncodeToString(Encrypt(bytes, gcm))
	return
}

// 解析 Token
func ParseToken(token string) (username string, expired bool, err error) {
	gcm, err := NewGCM(GetSecretKey())
	if err != nil {
		return
	}

	tokenBytes, _ := base64.StdEncoding.DecodeString(token)
	bytes, err := Decrypt(tokenBytes, gcm)
	if err != nil {
		return
	}

	genTime := binary.BigEndian.Uint64(bytes)
	expired = time.Since(time.Unix(int64(genTime), 0)) > 30*24*time.Hour
	username = string(bytes[8:])
	return
}
```

编辑 main.go 文件，增加登录相关代码

```go
// main.go

// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

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

		if user, found := users[form.Username]; !found || bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(form.Password)) != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10001,
				Message: "用户或密码错误",
			})
			return
		} else if token, err := GenerateToken(user.Username); err != nil {
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

最后让我们来测试一下，先运行服务器:

```bash
$ cd user-auth
$ go run .
```

然后通过 curl 工具发送测试请求:

```bash
# 发送注册请求
$ curl -d '{"username":"huoyijie","password":"mypassword"}' http://localhost:8080/signup
{"code":0,"data":"huoyijie"}

# 再次发送同样的注册请求
$ curl -d '{"username":"huoyijie","password":"mypassword"}' http://localhost:8080/signup
{"code":-10000,"message":"用户已存在"}

# 发送错误的登录请求
$ curl -d '{"username":"notexist","password":"mypassword"}' http://localhost:8080/signin
{"code":-10001,"message":"用户或密码错误"}

# 发送正确的登录请求
$ curl -d '{"username":"huoyijie","password":"mypassword"}' http://localhost:8080/signin
{"code":0,"data":"IUqArBlhegws+ojRMZS/SD+ZKWnm6dNcWgHlFfzyFunkly2/jJLq90WCb/M="}
```

返回的 data 字段就是新生成的 Token，客户端可以写入存储中（如 Cookie 或 localStorage）。

## 自动认证 Token

客户端收到服务器下发的 Token 后，可写入存储中（如 Cookie 或 localStorage），后续的 API 请求需在 Header中携带该 Token。服务器可通过拦截器在请求被处理前，解析 Token 、校验有校性、实现 Token 自动认证，然后获取登录用户信息并写入请求上下文中。

下面来实现一个请求拦截器，实现 Token 自动认证。首先编辑 main.go 文件，添加一个需要登录才能访问的接口 /private。

```go
// main.go
func main() {
	// ...
	r.GET("private", func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "private api",
		})
	})
	// ...
}
```

发送测试请求，接口返回了数据 `private api`。

```bash
$ curl http://localhost:8080/private
{"code":0,"data":"private api"}
```

接下来实现拦截器，继续编辑 main.go 文件

```go
// main.go
func() {
	// ...
	g := r.Group("", func(c *gin.Context) {
		// 实现拦截器
		auth := c.GetHeader("Authorization")
		// 未设置认证信息
		if len(auth) == 0 {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		t := strings.Split(auth, " ")
		// 认证信息格式不正确，正确格式如下
		// Authorization: Bearer eL8TZSnTs4LS/UR9cmw7n6oW3K7TVMg35IxDZWozKS+dNbqAYov09kVuoG0=
		if len(t) != 2 {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		token := t[1]
		if username, expired, err := ParseToken(token); err != nil {
			// Token 解析出错
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		} else if expired {
			// token 过期，需要重新登录
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		} else {
			// Token 认证成功，设置上下文信息
			c.Set("username", username)
		}
	})
	g.GET("private", func(c *gin.Context) {
		username := c.GetString("username")
		c.JSON(http.StatusOK, Result{
			Data: username,
		})
	})
	// ...
}
```

上面首先定义了一个 route group `g`，加入 `g` 的 api，在会执行 Token 认证。如果 Token 不存在或格式不正确、解析出错、过期，拦截器会返回 `401` 到客户端，客户端收到 `401` 后可跳转至登录页面。如果 Token 认证成功，则会把用户信息写入上下文中。

然后对 `/private` 接口做一个微调，从上下文中取出当前登录用户 username，并返回给客户端。后续其他需要登录保护的接口，都可以加入到 route group `g`。

上面解析 Token 时调用了 token.go 文件中定义的 ParseToken 方法:

```go
// token.go
// 解析 Token
func ParseToken(token string) (username string, expired bool, err error) {
	gcm, err := NewGCM(GetSecretKey())
	if err != nil {
		return
	}

	tokenBytes, _ := base64.StdEncoding.DecodeString(token)
	bytes, err := Decrypt(tokenBytes, gcm)
	if err != nil {
		return
	}

	genTime := binary.BigEndian.Uint64(bytes)
	expired = time.Since(time.Unix(int64(genTime), 0)) > 30*24*time.Hour
	username = string(bytes[8:])
	return
}
```

再次发送测试请求

```bash
# 未携带 Token，返回 401
$ curl -f http://localhost:8080/private
curl: (22) The requested URL returned error: 401

# 所携带 Token 通过前面登录接口生成，正确返回了 username
curl -f -H 'Authorization: Bearer +xUywII+VjD7o+y2/ZHJAFtVVgy46qRLly4LPSsfHJG1WS2EboimG/uiLcA=' http://localhost:8080/private
{"code":0,"data":"huoyijie"}
```

## API 访问授权

本文我们会基于 RABC(Role-based access control) 模型，实现基于角色的访问控制。RABC 是信息安全领域中，一种较新且广为使用的访问控制机制。RABC 模型中包含 User、Role、Permission 三个对象，一个 User 可以具有多个角色，一个角色可以有多项权限。其中 Permission 可以表达为 `"article:{action}"`，action 可以是 `get`、`add`、`change` `delete`，分别代表查询、新增、编辑和删除 article。

授权访问基本原理是为角色分配具体的权限(如: "article:add")，然后为用户赋予相应的角色，最后当用户访问资源时，通过拦截器 canAccess 检查当前用户是否具有权限，如果有权限则允许访问，否则拒绝访问返回 `403`。

第一步，先创建需要进行授权访问的资源，编辑 main.go，添加如下代码:

```go
// main.go
func main() {
	// ...
	g.GET("article/get", func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "Get article",
		})
	})
	g.GET("article/add", func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "add article",
		})
	})
	g.GET("article/change", func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "change article",
		})
	})
	g.GET("article/delete", func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "delete article",
		})
	})
	// ...
}
```

上面 4 个接口分别模拟查询、新增、编辑和删除 article，现在只需要登录即可访问，运行服务器 `go run .`。

```bash
# 登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"YGTApulsrdAGRc438jUmG+VrJGs12ElmJCjw3m8SPNc/W278n7dQYBS44+0="}

$ curl -f -H 'Authorization: Bearer YGTApulsrdAGRc438jUmG+VrJGs12ElmJCjw3m8SPNc/W278n7dQYBS44+0=' http://localhost:8080/article/get
{"code":0,"data":"Get article"}

$ curl -f -H 'Authorization: Bearer YGTApulsrdAGRc438jUmG+VrJGs12ElmJCjw3m8SPNc/W278n7dQYBS44+0=' http://localhost:8080/article/add
{"code":0,"data":"add article"}

$ curl -f -H 'Authorization: Bearer YGTApulsrdAGRc438jUmG+VrJGs12ElmJCjw3m8SPNc/W278n7dQYBS44+0=' http://localhost:8080/article/add
{"code":0,"data":"change article"}

$ curl -f -H 'Authorization: Bearer YGTApulsrdAGRc438jUmG+VrJGs12ElmJCjw3m8SPNc/W278n7dQYBS44+0=' http://localhost:8080/article/add
{"code":0,"data":"delete article"}
```

现在我们逐步增加授权访问逻辑。编辑 main.go，增加角色枚举常量定义:

```go
// main.go
// 定义角色
const (
	ADMIN int = iota + 1
	WRITER
	VIP
)
```

为用户模型增加角色字段。同时为了简化测试，预定义 3 个用户，分别具有 ADMIN、WRITER、VIP 角色，密码是 mypassword。然后为角色分配权限，这里是写死的，真实应用中数据可写入表中。

```go
// main.go
// 用户模型
type User struct {
	Username, PasswordHash string
	// 增加角色字段
	Roles                  []int
}

// 模拟数据库存储，读写 map 未加锁，不支持并发注册登录
var users = map[string]User{
	"huoyijie": {
		Username: "huoyijie",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
		Roles:        []int{ADMIN},
	},
	"jack": {
		Username: "jack",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
		Roles:        []int{WRITER},
	},
	"vip": {
		Username: "vip",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
		Roles:        []int{VIP},
	},
}

// 为角色分配权限，这里是写死的，真实应用中数据可写入表中
var permissions = map[int][]string{
	WRITER: {
		"article:get",
		"article:add",
		"article:change",
		"article:delete",
	},
	VIP: {
		"article:get",
	},
}
```

接下来实现权限检查拦截器

```go
// main.go
// 权限检查拦截器
func canAccess(permission string) func(c *gin.Context) {
	return func(c *gin.Context) {
		username := c.GetString("username")
		currentUser := users[username]
		for _, role := range currentUser.Roles {
			// 角色 ADMIN 拥有所有权限，允许当前用户访问
			if role == ADMIN {
				return
			}
			for _, perm := range permissions[role] {
				// 具有权限，运行当前用户访问
				if perm == permission {
					return
				}
			}
		}
		// 无权限，拒绝访问
		c.AbortWithStatus(http.StatusForbidden)
	}
}
```

最后为需要进行访问控制的资源配置拦截器 canAccess

```go
// main.go
func main() {
	// ...
	g.GET("article/get", canAccess("article:get"), func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "Get article",
		})
	})
	g.GET("article/add", canAccess("article:add"), func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "add article",
		})
	})
	g.GET("article/change", canAccess("article:change"), func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "change article",
		})
	})
	g.GET("article/delete", canAccess("article:delete"), func(c *gin.Context) {
		c.JSON(http.StatusOK, Result{
			Data: "delete article",
		})
	})
	...
}
```

现在运行服务器 `go run .`，然后发送测试请求验证访问控制是否正确

```bash
# 未登录返回 401
$ curl -f http://localhost:8080/article/get
curl: (22) The requested URL returned error: 401

# 登录 vip 用户，具有 VIP 角色，只有 "article:get" 权限
$ curl -d '{"username":"vip","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"zshlS3E/Rqp8XNRlerhfk7sSkMAi/+zqcz5qlaAv2Y1lP4bavJlm"}

# 允许访问
$ curl -f -H 'Authorization: Bearer zshlS3E/Rqp8XNRlerhfk7sSkMAi/+zqcz5qlaAv2Y1lP4bavJlm' http://localhost:8080/article/get
{"code":0,"data":"Get article"}

# 拒绝访问，返回 403
$ curl -f -H 'Authorization: Bearer zshlS3E/Rqp8XNRlerhfk7sSkMAi/+zqcz5qlaAv2Y1lP4bavJlm' http://localhost:8080/article/add
curl: (22) The requested URL returned error: 403
$ curl -f -H 'Authorization: Bearer zshlS3E/Rqp8XNRlerhfk7sSkMAi/+zqcz5qlaAv2Y1lP4bavJlm' http://localhost:8080/article/change
curl: (22) The requested URL returned error: 403
$ curl -f -H 'Authorization: Bearer zshlS3E/Rqp8XNRlerhfk7sSkMAi/+zqcz5qlaAv2Y1lP4bavJlm' http://localhost:8080/article/delete
curl: (22) The requested URL returned error: 403

# 登录 jack 用户，具有 WRITER 角色，有 article:get/article:add/article:change/article:delete 所有权限
$ curl -d '{"username":"jack","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"m/qQX0vQQpsddwq+3qwQtogHDskw4izqflziO5pFsKz4k1CTrgURlw=="}

# 允许访问
$ curl -f -H 'Authorization: Bearer m/qQX0vQQpsddwq+3qwQtogHDskw4izqflziO5pFsKz4k1CTrgURlw==' http://localhost:8080/article/get
{"code":0,"data":"Get article"}
$ curl -f -H 'Authorization: Bearer m/qQX0vQQpsddwq+3qwQtogHDskw4izqflziO5pFsKz4k1CTrgURlw==' http://localhost:8080/article/add
{"code":0,"data":"add article"}
$ curl -f -H 'Authorization: Bearer m/qQX0vQQpsddwq+3qwQtogHDskw4izqflziO5pFsKz4k1CTrgURlw==' http://localhost:8080/article/change
{"code":0,"data":"change article"}
$ curl -f -H 'Authorization: Bearer m/qQX0vQQpsddwq+3qwQtogHDskw4izqflziO5pFsKz4k1CTrgURlw==' http://localhost:8080/article/delete
{"code":0,"data":"delete article"}

# 登录 huoyijie 用户，具有 ADMIN 角色，具有所有权限
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":0,"data":"LtlWrZy6c62x12E+w2omutsc2mGwHFDed3HhaE+eWDKPJlc1kIo6wPPq8GQ="}

# 允许访问
$ curl -f -H 'Authorization: Bearer LtlWrZy6c62x12E+w2omutsc2mGwHFDed3HhaE+eWDKPJlc1kIo6wPPq8GQ=' http://localhost:8080/article/get
{"code":0,"data":"Get article"}
$ curl -f -H 'Authorization: Bearer LtlWrZy6c62x12E+w2omutsc2mGwHFDed3HhaE+eWDKPJlc1kIo6wPPq8GQ=' http://localhost:8080/article/add
{"code":0,"data":"add article"}
$ curl -f -H 'Authorization: Bearer LtlWrZy6c62x12E+w2omutsc2mGwHFDed3HhaE+eWDKPJlc1kIo6wPPq8GQ=' http://localhost:8080/article/change
{"code":0,"data":"change article"}
$ curl -f -H 'Authorization: Bearer LtlWrZy6c62x12E+w2omutsc2mGwHFDed3HhaE+eWDKPJlc1kIo6wPPq8GQ=' http://localhost:8080/article/delete
{"code":0,"data":"delete article"}
```

可以通过测试输出看到，具有不同角色的用户访问 article 时，系统给出了正确的授权决定。