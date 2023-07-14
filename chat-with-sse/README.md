# 基于 Server Sent Events 和 React 实现一个 IM 原型

本文主要基于 SSE、React、Tailwind CSS 等技术实现一个即时通信 IM 原型，支持发送/接收实时消息、离线消息，支持显示用户在线状态，支持显示未读消息数等功能。主要是探索如何仅通过 HTTP (POST + SSE) 协议实现客户端与服务器的双向通信，在客户端引入 React 框架，简化应用状态与 UI 之间的同步，最后引入时下非常流行的 Tailwind 库，避免手写 CSS 规则。

![chat-with-sse-react](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react.png)

## 功能

* 在线状态
* 离线消息
* 未读消息数

## Github 项目地址

本文代码在 [tech-notes-code/chat-with-sse](https://github.com/huoyijie/tech-notes-code) 目录下，代码注释很详细，可以边看文章边看代码。

## Server Sent Events

[SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) 是一种基于 HTTP 连接的服务器推送技术，客户端与服务器初始化好连接后，服务器可以随时向客户端发送内容更新。SSE 是对 HTTP 协议很好的补充，可以轻松实现客户端与服务器双向通信。

## 客户端与服务器通信

每个用户打开客户端后，会通过自动订阅服务器 Server Sent Events，服务器可以通过 SSE 实时向客户端推送新消息。用户发消息时，客户端可以通过 POST 请求到服务器，并由服务器进行消息存储或通过 SSE 实时转发给收信方。发送群消息是类似的。

```
           'hi,...'      (huoyijie)
    +<-1.Send MSG(POST)--<+------+
    |                     |      |
+---v--+                  |Chrome|
|      |<----Subscribe---<|      |
| HTTP |         |        +------+
|      |       (Get)
|Server|         |        +------+
|      |<----Subscribe---<|      |
+---v--+                  |Chrome|
    |                     |      |
    +>2.Forward MSG(SSE)->+------+
           'hi,...'        (jack)
```

## 服务器

**Gin**

后端是基于 Golang 的 [Gin](https://github.com/gin-gonic/gin) Web 框架实现，通过 Gin 实现 SSE 订阅、与客户端进行通信是非常简单的。

## 客户端

**React**

前端使用的 [React](https://zh-hans.react.dev/) 框架，通过定义函数式组件把 UI 拆分成不同的嵌套组件，在每个组件内部控制自己的状态和样式。应用组件思想构建 UI，有点像搭乐高很有趣。一方面 React 可以帮助你根据应用状态自动更新 UI 展示，无需手动操作 DOM 元素。另一方面没有了长长的 html 代码片段，而是拆分成了很多的 jsx 组件文件，每个组件单独一个文件，代码结构更清晰。

```bash
$ tree -l
├── public
│   ├── images
│   │   ├── huoyijie.svg
│   │   ├── jack.svg
│   │   └── rose.svg
│   └── js
│       ├── App.jsx
│       ├── ChatBoxHeader.jsx
│       ├── ChatBoxInput.jsx
│       ├── ChatBox.jsx
│       ├── ChatBoxMessageList.jsx
│       ├── Chat.jsx
│       ├── Header.jsx
│       ├── Message.jsx
│       ├── PaperPlane.jsx
│       ├── SSE.js
│       ├── UserList.jsx
│       └── Users.jsx
├── data.go
├── main.go
├── sse.go
├── subscribe.go
└── templates
    └── index.htm
```

上述是代码目录结构，`public/js` 目录下是所有的函数组件，下图标记了主要的组件。

![react-components](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react-components.png)

**Tailwind CSS**

CSS 样式是用时下非常流行的 [Tailwind (A utility-first CSS framework)](https://tailwindcss.com/) 写的，可以通过非常丰富的内置 class 精细的控制页面样式，不过这是我第一次使用，还不太熟。

## 运行

```bash
# 安装依赖
$ go mod tidy
# 启动应用
$ go run .
```

打开浏览器，访问 `http://localhost:8000/join?user=huoyijie` 进入 GoChat 界面。可以多打开几个 Tab 页面模拟多个用户，记得修改 URL 中的 user 参数。服务端代码写死了只能用 huoyijie、jack、rose 三个用户。

![chat-with-rose](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-rose.png)

![chat-with-sse-react](https://cdn.huoyijie.cn/uploads/2023/07/chat-with-sse-react.png)

## 最后

我最近发现，大家好像对文中出现的代码不太感兴趣，所以本文没有讲解代码，而是通过注释的方式注解了代码，大家可以放心的去边看代码边学习。

## 待优化

* 随着聊天消息进行，总是把最新的消息显示在视野范围内
* 聊天消息旁边显示头像

## Bugs

* 聊天消息 overflow
* 停留在聊天界面，收到消息，点其他页面，用户列表会突然显示未读消息数
