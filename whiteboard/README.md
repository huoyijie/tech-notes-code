<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/video.js@8.0.4/dist/video-js.min.css">
<script src="https://cdn.jsdelivr.net/npm/video.js@8.0.4/dist/video.min.js"></script>
<script>
    window.HELP_IMPROVE_VIDEOJS = false
</script>

# 基于 Websocket 和 Canvas 实现一个共享白板(WhiteBoard)

本文主要基于 Websocket、Canvas、React、msgpack、Tailwind CSS 等技术实现一个共享白板原型，支持在多个手机、桌面浏览器之间共享一个无限大小、任意缩放的画板，并实时同步绘画、涂鸦。项目通过 Canvas 渲染画板、产生涂鸦数据。然后通过 websocket+msgpack 实现客户端与服务器的双向通信，并在多个设备之间实时同步涂鸦数据。前端采用 React 简化应用状态与 UI 之间的同步，支持手机触屏操作涂鸦。

![whiteboard](https://cdn.huoyijie.cn/uploads/2023/07/whiteboard-desktop.png)

## Github 项目地址

代码放在 [tech-notes-code/whiteboard](https://github.com/huoyijie/tech-notes-code) 目录下(代码注释很详细)。

## 运行

```bash
# 自动下载安装依赖
$ go mod tidy
# 启动应用
$ go run .
```

用手机、桌面浏览器打开 `http://localhost:8000` 地址访问共享画板，可以在桌面浏览器中多打开几个标签页同时访问。

**桌面浏览器**

<br><video id="video-1" class="video-js" controls muted preload="auto" width="720" poster="https://cdn.huoyijie.cn/uploads/2023/07/whiteboard-desktop.png" data-setup="{}">
  <source src="https://cdn.huoyijie.cn/uploads/2023/07/whiteboard.webm" type="video/webm">
</video><br>

**手机浏览器触屏**

<br><video id="video-2" class="video-js" controls muted preload="auto" width="400" poster="https://cdn.huoyijie.cn/uploads/2023/07/whiteboard.png" data-setup="{}">
  <source src="https://cdn.huoyijie.cn/uploads/2023/07/whiteboard-mobile.mov" type="video/mp4">
</video><br>

## 技术实现

**Canvas**

canvas 是一个可以使用 JS 来绘制图形的 HTML 元素。例如，它可以用于绘制图表、制作图片构图或者制作简单的动画。可参考 [Canvas_API/Tutorial](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial)

**Websocket、React、msgpack、Tailwind CSS**

可参考上篇文章[基于 Websocket 和 React 实现一个 IM 原型](https://huoyijie.cn/docsifys/Tech-Notes/chat-with-websocket-react)中有介绍