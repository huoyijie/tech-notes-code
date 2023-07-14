# 实现端到端 HTTP 消息真实、完整性验证

## 端到端 HTTP 消息是指什么?

```
+--------+       +-------+          +-------+       +--------+
|        |       |       |          |       |       |        |
| Client |-http->| Proxy |--https-->| Nginx |-http->| Server |
|        |       |       |          |       |       |        |
+---+----+       +---+---+          +---+---+       +----+---+
    |                |                  |                |
    |                |<-TLS end to end->|                |
    |                                                    |
    |<------------- http message end to end ------------>|
```

如上图，有些时候 Client 可能部署在 Proxy 后面，http 消息需要 Proxy 转发出去。更多的时候，业务服务器都会部署在像 Nginx 这样的反向代理后面。从 Client 发出 http 消息到 Server 接收到消息，即端到端 HTTP 消息。无论是从 Client 直接发出 http 消息到 Nginx 接收或从 Client 发出经 Proxy https 转发到 Nginx 接收，属于 TLS 通信端到端。

## 什么是真实、完整性验证？

是指 Client、Server 可以通过某种方法验证消息在传输过程中，没有被任何中间节点修改过。

## HTTPS 不能保证客户端或服务器接收到真实、完整的消息

Nginx 或 Proxy 等中间节点可以修改 http message，在不影响 http 语义的情况下，Client 或 Server 无法确认消息是否真实完整。

## 如何实现端到端 HTTP 消息真实、完整性验证

Client 在请求发出前对 request 进行签名，Server 端收到后可验证签名，然后返回签过名的 response，Client 同样验证签名。

## HTTP Message Signatures 协议

中间节点在转发 http message 时，调整 header 中的字段顺序、转换 Key 的大小写、添加键值对等很多行为都是被 http 协议允许的，所以对 http message 进行签名需要一个统一的 [HTTP Message Signatures](https://httpwg.org/http-extensions/draft-ietf-httpbis-message-signatures.html) 扩展协议(目前还是草案)。

## HTTP Message Signatures 实现

[Python 语言实现](https://github.com/pyauth/http-message-signatures)

## HTTP 请求签名实例

接下来我们基于上面的 Python 实现来编写一个 HTTP 请求签名实例程序，文中所有代码已放到 [Github http-request-signature](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*

已安装 Python 3.10+
已安装 IDE (如 vscode)

首先初始化项目([参考 Flask 安装](https://flask.palletsprojects.com/en/2.3.x/installation/#virtual-environments))

```bash
$ mkdir http-request-signature && cd http-request-signature
# Linux 确保已安装 python3.10-venv，Windows/MacOS 跳过
$ sudo apt install python3.10-venv
# 创建并激活虚拟环境
$ python3 -m venv .venv
$ . .venv/bin/activate
# 安装 Flask、http 消息签名扩展协议、requests
$ pip install Flask http-message-signatures requests
```

**密钥生成函数 & Magic number**

创建 app_key.py 文件，添加获取密钥相关方法

```python
import math
from http_message_signatures import HTTPSignatureKeyResolver

# 配置密钥生成函数
key_gen = lambda key_id: bytes(str(math.sqrt(2023)), 'utf-8')

class MyHTTPSignatureKeyResolver(HTTPSignatureKeyResolver):
  def resolve_public_key(self, key_id: str):
    return key_gen(key_id=key_id)

  def resolve_private_key(self, key_id: str):
    return key_gen(key_id=key_id)
```

注意 key_gen 密钥生成函数:

```python
# a = sqrt(2023)   // 取根号
# b = to_string(a) // 把浮点数转化为字符串
# c = get_bytes(b) // 获取 utf8 编码字节数组作为密钥
key_gen = lambda key_id: bytes(str(math.sqrt(2023)), 'utf-8')
```

Client 与 Server 只要提前约定好一个 Magic number(如: 2023)，就可以通过这个函数生成密钥。如果 Client 是运行在用户电脑上的浏览器或者手机上的 App，如何防止恶意用户通过反编译代码或者查看 JS 代码来找出这个密钥生成函数甚至这个 Magic number 呢？代码肯定要进行混淆压缩及其他反编译操作，最大程度隐匿好这个函数及 Magic number。

**Server**

```python
from flask import Flask, request, abort

from http_message_signatures import HTTPMessageVerifier, algorithms
from app_key import MyHTTPSignatureKeyResolver

verifier = HTTPMessageVerifier(signature_algorithm=algorithms.HMAC_SHA256, key_resolver=MyHTTPSignatureKeyResolver())

app = Flask(__name__)

@app.route('/hello/<greeting>', methods=['POST'])
def hello(greeting):
  try:
    print(request.headers)
    verifyReuslt = verifier.verify(request)
    print(verifyReuslt)
    # todo 需验证 body 与 content-digest 一致，确保 body 没有被修改
  except Exception as e:
    print(e)
    abort(400)

  return 'hello, %s | HELLO, %s!' %(greeting, request.json['HELLO'])

@app.errorhandler(400)
def bad_request(error):
  return 'Bad Request', 400
```

**Client**

```python
import requests, hashlib, http_sfv

from http_message_signatures import HTTPMessageSigner, algorithms
from app_key import MyHTTPSignatureKeyResolver

signer = HTTPMessageSigner(signature_algorithm=algorithms.HMAC_SHA256, key_resolver=MyHTTPSignatureKeyResolver())

request = requests.Request('POST', 'http://localhost:5000/hello/world', json={'HELLO': 'WORLD'})
request = request.prepare()
# 计算 request.body Digest
request.headers['Content-Digest'] = str(http_sfv.Dictionary({'sha-256': hashlib.sha256(request.body).digest()}))

# todo 签名参数可包含签名过期时间，可拒绝签名过期的消息，可以防止恶意请求重放攻击
signer.sign(request, key_id='my_key_id', covered_component_ids=('@method', '@authority', '@target-uri', 'content-digest'))
print(request.headers)

response = requests.Session().send(request=request)
print(response.content)
```

**合法请求签名验证**

启动服务器:

```bash
# 运行 Server
$ flask --app app run
```

运行客户端并查看输出:

```bash
# 运行客户端
$ python client.py

{'Content-Length': '18', 'Content-Type': 'application/json', 'Content-Digest': 'sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:', 'Signature-Input': 'pyhms=("@method" "@authority" "@target-uri" "content-digest");created=1688280177;keyid="my_key_id";alg="hmac-sha256"', 'Signature': 'pyhms=:ClekUIgpDllS9IeeIrgXFfuoDVsrnGsTgTCARNsYUiQ=:'}
b'hello, world | HELLO, WORLD!'
```

Client 会先对 Post 请求 body 计算 digest，然后写入 `Content-Digest`，然后对 `Signature-Input` 字符串值计算签名，写入 `Signature`。Signature-Input 字符串是可以根据需求进行设置的，此例主要有 `"@method" "@authority" "@target-uri" "content-digest"` 组成，换句话说，中间节点(如: Nginx)一旦修改 method、authority、url 路径参数等、请求 body 等，就会被发现。`Signature-Input` 中还可以包括签名生成时间、签名过期时间、密钥 ID 和签名算法等。其中，签名过期时间可以用来防止恶意请求重放攻击。

查看 Server 输出:

```bash
Host: localhost:5000
Accept-Encoding: identity
User-Agent: python-urllib3/2.0.3
Content-Length: 18
Content-Type: application/json
Content-Digest: sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:
Signature-Input: pyhms=("@method" "@authority" "@target-uri" "content-digest");created=1688280177;keyid="my_key_id";alg="hmac-sha256"
Signature: pyhms=:ClekUIgpDllS9IeeIrgXFfuoDVsrnGsTgTCARNsYUiQ=:


[VerifyResult(label='pyhms', algorithm=<class 'http_message_signatures._algorithms.HMAC_SHA256'>, covered_components=OrderedDict([('"@method"', 'POST'), ('"@authority"', 'localhost:5000'), ('"@target-uri"', 'http://localhost:5000/hello/world'), ('"content-digest"', 'sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:'), ('"@signature-params"', '("@method" "@authority" "@target-uri" "content-digest");created=1688280177;keyid="my_key_id";alg="hmac-sha256"')]), parameters={'created': 1688280177, 'keyid': 'my_key_id', 'alg': 'hmac-sha256'}, body=None)]
127.0.0.1 - - [02/Jul/2023 14:42:57] "POST /hello/world HTTP/1.1" 200 -
```

Server 收到的请求中包含 `Content-Digest`、`Signature-Input`、`Signature` 三个字段，服务器可根据 `Signature-Input` 中包含的信息重新计算签名值并与 `Signature` 比对确认。如果不一致，说明请求被修改过，可直接返回 400。如果签名比对成功，还需要根据请求 body 计算 digest 并与 `Content-Digest` 比对，如果不一致，说明请求 body 被修改过，如果比对成功，则认为请求是真实完整的，可以进行后续处理。

上面输出了签名验证结果，签名验证成功返回 200。再回过头看 Client 端输出:

```bash
b'hello, world | HELLO, WORLD!'
```

Client 成功输出了 Server 的 200 响应。

**非法请求签名验证**

保持服务器继续运行，服务器刚刚读取了 Magic number 2023 生成的密钥，然后临时把 app_key.py 文件中的 Magic number 改为 2024(模拟猜密钥的恶意用户)再次运行 Client。

Client 输出 400 Bad Request:

```bash
$ python client.py 
{'Content-Length': '18', 'Content-Type': 'application/json', 'Content-Digest': 'sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:', 'Signature-Input': 'pyhms=("@method" "@authority" "@target-uri" "content-digest");created=1688281810;keyid="my_key_id";alg="hmac-sha256"', 'Signature': 'pyhms=:Ekg4hM8s4JCeJNZVNP6mZ7Ow25vlUus+vkzW1QF7rFM=:'}
b'Bad Request'
```

Server 输出:

```bash
Host: localhost:5000
Accept-Encoding: identity
User-Agent: python-urllib3/2.0.3
Content-Length: 18
Content-Type: application/json
Content-Digest: sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:
Signature-Input: pyhms=("@method" "@authority" "@target-uri" "content-digest");created=1688280177;keyid="my_key_id";alg="hmac-sha256"
Signature: pyhms=:ClekUIgpDllS9IeeIrgXFfuoDVsrnGsTgTCARNsYUiQ=:


[VerifyResult(label='pyhms', algorithm=<class 'http_message_signatures._algorithms.HMAC_SHA256'>, covered_components=OrderedDict([('"@method"', 'POST'), ('"@authority"', 'localhost:5000'), ('"@target-uri"', 'http://localhost:5000/hello/world'), ('"content-digest"', 'sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:'), ('"@signature-params"', '("@method" "@authority" "@target-uri" "content-digest");created=1688280177;keyid="my_key_id";alg="hmac-sha256"')]), parameters={'created': 1688280177, 'keyid': 'my_key_id', 'alg': 'hmac-sha256'}, body=None)]
127.0.0.1 - - [02/Jul/2023 14:42:57] "POST /hello/world HTTP/1.1" 200 -



Host: localhost:5000
Accept-Encoding: identity
User-Agent: python-urllib3/2.0.3
Content-Length: 18
Content-Type: application/json
Content-Digest: sha-256=:MsGxAEZ587wiuQv/NjG3PO8JMCPc2caKF2kOfDHYD1A=:
Signature-Input: pyhms=("@method" "@authority" "@target-uri" "content-digest");created=1688281810;keyid="my_key_id";alg="hmac-sha256"
Signature: pyhms=:Ekg4hM8s4JCeJNZVNP6mZ7Ow25vlUus+vkzW1QF7rFM=:


Signature did not match digest.
127.0.0.1 - - [02/Jul/2023 15:10:10] "POST /hello/world HTTP/1.1" 400 -
```

可以看到签名验证失败并返回了 400。还句话说，如果恶意用户不知道 Magic number 及密钥生成方法，是没有办法发送请求的。还有另一种情况，如果中间节点修改了参与计算签名的那些字段的值也会导致签名验证不通过。应该把确保 http 消息安全的重要字段都加入到签名计算中，例如 OAuth 2.0 协议建议让 `Authorization: Bearer $access_token` 参与签名计算，确保 http message 中的 Authorization 字段不能被修改。

## 结论

对 http message 进行签名和验证，可以杜绝中间节点有意或无意的修改，确保 http 消息真实完整。也可以防止恶意用户对服务器发送非法请求(如: 恶意刷接口)。