# 基于 socket.io 实现多人实时协作无限大小缩放共享白板(WhiteBoard)

上篇文章介绍了如何[基于 Websocket 和 Canvas 实现一个共享白板(WhiteBoard)](https://huoyijie.cn/docsifys/Tech-Notes/share-whiteboard-with-websocket)，如果查看代码还是比较复杂的，里面直接基于 websocket 进行双向通信，引入了 msgpack 二进制序列化格式，读写 message 时需要进行序列化与反序列化，服务端还需要间隔进行心跳检测，客户端需要实现断线自动重连逻辑。服务端为了能够实时广播涂鸦数据，还保存了一个所有客户端的 map。上述提到的这些方面，[socket.io](https://socket.io/) 都在框架内封装好了不需要额外关注，本文通过引入 socket.io，极大的简化了服务器与客户端的通信实现，尤其是服务器端，由几百行代码缩减到只有不足二十行。

![whiteboard-socket.io](https://cdn.huoyijie.cn/uploads/2023/07/whiteboard-socket.io.png)

## Github 项目地址

代码放在 [tech-notes-code/whiteboard-with-socket.io](https://github.com/huoyijie/tech-notes-code) 目录下(注释很详细)。

## 代码实现

**服务器**

```js
// index.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
// 定义静态资源路径
app.use(express.static('public'));

// 创建 http server
const httpServer = createServer(app);

// 创建 socket.io server
const io = new Server(httpServer, {
  serveClient: false,
});

// 新客户端连接
io.on('connection', (socket) => {
  // 收到客户端新笔划请求
  socket.on('drawing', (drawing) => {
    // 广播给其他客户端
    socket.broadcast.emit('drawing', drawing);
  });
});

// 启动服务器，监听 3000 端口
httpServer.listen(3000);
console.log('click http://localhost:3000');
```

可以看到服务器代码非常简单，连接建好后，只需要监听 drawing 事件并进行广播即可。

**客户端**

* React App 组件

```js
// App.jsx
// React App
function App() {
  return (
    <React.StrictMode>
      <WhiteBoard />
    </React.StrictMode>
  );
}

const { createRoot } = ReactDOM;
// 挂载 React App
const root = createRoot(document.querySelector('#app'));
root.render(<App />);
```

* WhiteBoard 组件

```js
// WhiteBoard.jsx
function WhiteBoard() {
  const { useRef, useState, useEffect, Fragment } = React;
  const canvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => WB.init(canvasRef, setCursor), []);

  const canvasClass = () => {
    let c = 'w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  const colorClass = (color) => {
    let c = 'inline-block w-16 h-16';
    if (color === 'black') {
      c += ' bg-black';
    } else {
      c += ` bg-${color}-500`;
    }
    if (selectedColor === color) {
      c += ' border-4 border-white';
    }
    return c;
  };

  // 点击颜色组件选色处理函数
  const selectColor = (color) => {
    setSelectedColor(color);
    WB.setColor(color);
  };
  return (
    <Fragment>
      {/* 画板 */}
      <canvas ref={canvasRef} id="canvas" className={canvasClass()}></canvas>
      {/* 画笔颜色选择 */}
      <div className="fixed top-0 left-0">
        <div className={colorClass('black')} onClick={() => selectColor('black')}></div>
        <div className={colorClass('red')} onClick={() => selectColor('red')}></div>
        <div className={colorClass('green')} onClick={() => selectColor('green')}></div>
        <div className={colorClass('blue')} onClick={() => selectColor('blue')}></div>
        <div className={colorClass('yellow')} onClick={() => selectColor('yellow')}></div>
      </div>
    </Fragment>
  );
}
```

* 白板实现逻辑

```js
// WB.js
// 回调限流: 至少间隔 delay 毫秒才会调用事件处理回调函数
function throttle(callback, delay) {
  let previousCall = new Date().getTime();
  return function () {
    const time = new Date().getTime();

    if ((time - previousCall) >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}

const WB = {
  // socket.io 连接句柄
  socket: null,

  // 画板和上下文
  canvas: null,
  cxt: null,

  // 根据不同状态设置鼠标样式，如正在涂鸦或者移动画板
  setCursor: null,

  // 画笔
  pen: {
    // 默认颜色
    color: 'black',
    // 默认线宽
    size: 2,
  },

  // 所有绘画数据
  drawings: [],

  // 画板移动偏移量
  offsetX: 0,
  offsetY: 0,

  // 缩放因子，画板可缩小或者放大
  scale: 1,

  // 鼠标移动前坐标
  prevCursorX: 0,
  prevCursorY: 0,
  // 按住左键涂鸦
  leftMouseDown: false,
  // 按住右键移动画板
  rightMouseDown: false,
  // 通过滚轮控制放大 or 缩小画板

  // 触屏 (最多 2 个触点)
  prevTouches: [null, null],
  singleTouch: false,
  doubleTouch: false,

  // 初始化画板
  init(canvasRef, setCursor) {
    const that = this;
    // 获取画板元素及上下文对象
    this.canvas = canvasRef.current;
    this.cxt = this.canvas.getContext('2d');
    // 当画板上进入不同状态时可通过此函数变换鼠标样式
    this.setCursor = setCursor;

    // 添加鼠标事件处理
    this.canvas.addEventListener('mousedown', onMouseDown, false);
    // 释放鼠标事件处理
    this.canvas.addEventListener('mouseup', onMouseUp, false);
    this.canvas.addEventListener('mouseout', onMouseUp, false);
    this.canvas.addEventListener('wheel', throttle(onMouseWheel, 10), false);
    // 移动鼠标事件处理
    this.canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

    // 添加手机触屏事件处理
    this.canvas.addEventListener('touchstart', onTouchStart, false);
    this.canvas.addEventListener('touchend', onTouchEnd, false);
    this.canvas.addEventListener('touchcancel', onTouchEnd, false);
    this.canvas.addEventListener('touchmove', throttle(onTouchMove, 10), false);

    // 建立 socket.io 连接
    this.socket = io();
    this.socket.on('drawing', (drawing) => {
      that.onRecvDrawing(drawing);
    })
    // 关闭浏览器 tab 页面，确保关闭 socket 连接
    window.onbeforeunload = () => {
      that.socket.disconnect();
    };
    // window resize, redraw
    window.addEventListener('resize', () => {
      that.redraw();
    }, false);
    // 禁止右键唤起上下文菜单
    document.oncontextmenu = () => false;

    // 初始化画板
    this.redraw();
  },
  
  // 设置画笔颜色
  setColor(color) {
    this.pen.color = color;
  },

  // 每当移动画板、放大缩小画板、resize 窗口大小都需要重新绘制画板
  redraw() {
    // 设置画板长和宽为窗口大小
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    // 设置白色背景
    this.cxt.fillStyle = '#fff';
    this.cxt.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制所有笔划，存储在 drawings 中
    for (let drawing of this.drawings) {
      this.drawLine(
        drawing.pen,
        this.toX(drawing.x0),
        this.toY(drawing.y0),
        this.toX(drawing.x1),
        this.toY(drawing.y1),
      );
    }
  },
  
  // 画线段
  drawLine(pen, x0, y0, x1, y1) {
    this.cxt.beginPath();
    this.cxt.moveTo(x0, y0);
    this.cxt.lineTo(x1, y1);
    this.cxt.strokeStyle = pen.color;
    this.cxt.lineWidth = pen.size;
    this.cxt.stroke();
    this.cxt.closePath();
  },
  
  /* 坐标转换函数开始 */

  // 转换为实际 x 坐标
  toX(xL) {
    return (xL + this.offsetX) * this.scale;
  },

  toY(yL) {
    return (yL + this.offsetY) * this.scale;
  },

  // 转换为逻辑坐标
  toLogicX(x) {
    return (x / this.scale) - this.offsetX;
  },

  toLogicY(y) {
    return (y / this.scale) - this.offsetY;
  },

  // 逻辑画板高度
  logicHeight() {
    return this.canvas.height / this.scale;
  },

  // 逻辑画板宽度
  logicWidth() {
    return this.canvas.width / this.scale;
  },
  /* 坐标转换函数结束 */

  // 当从服务器接收到涂鸦数据，需要在画板上实时绘制
  onRecvDrawing(drawing) {
    // 保存绘画数据
    this.drawings.push(drawing);
    // 绘制笔划
    this.drawLine(
      drawing.pen,
      this.toX(drawing.x0),
      this.toY(drawing.y0),
      this.toX(drawing.x1),
      this.toY(drawing.y1),
    );
  }
};

/* 鼠标事件处理开始 */
const onMouseDown = (e) => {
  // 判断按键
  WB.leftMouseDown = e.button == 0;
  WB.rightMouseDown = e.button == 2;
  if (WB.leftMouseDown) {
    WB.setCursor('crosshair');
  } else if (WB.rightMouseDown) {
    WB.setCursor('move');
  }
  // 更新鼠标移动前坐标
  WB.prevCursorX = e.pageX;
  WB.prevCursorY = e.pageY;
};

const onMouseUp = (e) => {
  WB.leftMouseDown = false;
  WB.rightMouseDown = false;
  // 恢复默认鼠标样式
  WB.setCursor(null);
};

const onMouseMove = (e) => {
  // 更新移动后坐标
  const cursorX = e.pageX;
  const cursorY = e.pageY;

  // 按住左键移动鼠标进行涂鸦
  if (WB.leftMouseDown) {
    const drawing = {
      pen: WB.pen,
      x0: WB.toLogicX(WB.prevCursorX),
      y0: WB.toLogicY(WB.prevCursorY),
      x1: WB.toLogicX(cursorX),
      y1: WB.toLogicY(cursorY),
    };
    // 保存笔划
    WB.drawings.push(drawing);
    // 把当前笔划发送到服务器
    WB.socket.emit('drawing', drawing);
    // 绘制笔划
    WB.drawLine(
      WB.pen,
      WB.prevCursorX,
      WB.prevCursorY,
      cursorX,
      cursorY,
    );
  }

  // 按住右键移动鼠标进行画板移动
  if (WB.rightMouseDown) {
    WB.offsetX += (cursorX - WB.prevCursorX) / WB.scale;
    WB.offsetY += (cursorY - WB.prevCursorY) / WB.scale;
    // 移动画板过程中会不断重新绘制
    WB.redraw();
  }

  // 更新移动前鼠标坐标为最新值
  WB.prevCursorX = cursorX;
  WB.prevCursorY = cursorY;
};

const onMouseWheel = (e) => {
  const deltaY = e.deltaY;
  const scaleAmount = -deltaY / 500;
  WB.scale *= (1 + scaleAmount);

  // 基于鼠标箭头位置决定怎样伸缩
  var distX = e.pageX / WB.canvas.width;
  var distY = e.pageY / WB.canvas.height;

  // 计算伸缩量
  const unitsZoomedX = WB.logicWidth() * scaleAmount;
  const unitsZoomedY = WB.logicHeight() * scaleAmount;

  const unitsAddLeft = unitsZoomedX * distX;
  const unitsAddTop = unitsZoomedY * distY;

  WB.offsetX -= unitsAddLeft;
  WB.offsetY -= unitsAddTop;

  WB.redraw();
};
/* 鼠标事件处理结束 */

/* 触屏事件处理开始 */

const onTouchStart = (e) => {
  // 检测到一个触屏点为单手指
  WB.singleTouch = e.touches.length == 1;
  // 多于 2 个触点等同于 2 个，双手指
  WB.doubleTouch = e.touches.length > 1;
  // 只记录 2 个触点坐标
  WB.prevTouches[0] = e.touches[0];
  WB.prevTouches[1] = e.touches[1];
};

const onTouchMove = (e) => {
  // 获取第 1 个触点坐标
  const touch0X = e.touches[0].pageX;
  const touch0Y = e.touches[0].pageY;
  const prevTouch0X = WB.prevTouches[0].pageX;
  const prevTouch0Y = WB.prevTouches[0].pageY;

  // 一根手指绘制笔划
  if (WB.singleTouch) {
    // 记录笔划
    const drawing = {
      pen: WB.pen,
      x0: WB.toLogicX(prevTouch0X),
      y0: WB.toLogicY(prevTouch0Y),
      x1: WB.toLogicX(touch0X),
      y1: WB.toLogicY(touch0Y)
    };
    // 保存笔划
    WB.drawings.push(drawing);
    // 发送笔画到服务器，同步给其他用户
    WB.socket.emit('drawing', drawing);
    // 绘制笔划
    WB.drawLine(WB.pen, prevTouch0X, prevTouch0Y, touch0X, touch0Y);
  }

  // 两根以上手指移动或伸缩画板
  if (WB.doubleTouch) {
    // 获取第 2 个触点坐标
    const touch1X = e.touches[1].pageX;
    const touch1Y = e.touches[1].pageY;
    const prevTouch1X = WB.prevTouches[1].pageX;
    const prevTouch1Y = WB.prevTouches[1].pageY;

    // 获取 2 个触点中间坐标
    const midX = (touch0X + touch1X) / 2;
    const midY = (touch0Y + touch1Y) / 2;
    const prevMidX = (prevTouch0X + prevTouch1X) / 2;
    const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;

    // 计算触点之间的距离
    const hypot = Math.sqrt(Math.pow((touch0X - touch1X), 2) + Math.pow((touch0Y - touch1Y), 2));
    const prevHypot = Math.sqrt(Math.pow((prevTouch0X - prevTouch1X), 2) + Math.pow((prevTouch0Y - prevTouch1Y), 2));

    // calculate the screen scale change
    const zoomAmount = hypot / prevHypot;
    WB.scale *= zoomAmount;
    const scaleAmount = 1 - zoomAmount;

    // calculate how many pixels the midpoints have moved in the x and y direction
    const panX = midX - prevMidX;
    const panY = midY - prevMidY;
    // scale WB movement based on the zoom level
    WB.offsetX += (panX / WB.scale);
    WB.offsetY += (panY / WB.scale);

    // Get the relative position of the middle of the zoom.
    // 0, 0 would be top left. 
    // 0, 1 would be top right etc.
    const zoomRatioX = midX / WB.canvas.width;
    const zoomRatioY = midY / WB.canvas.height;

    // calculate the amounts zoomed from each edge of the screen
    const unitsZoomedX = WB.logicWidth() * scaleAmount;
    const unitsZoomedY = WB.logicHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * zoomRatioX;
    const unitsAddTop = unitsZoomedY * zoomRatioY;

    WB.offsetX += unitsAddLeft;
    WB.offsetY += unitsAddTop;

    WB.redraw();
  }

  // 更新触点坐标
  WB.prevTouches[0] = e.touches[0];
  WB.prevTouches[1] = e.touches[1];
};

const onTouchEnd = (e) => {
  WB.singleTouch = false;
  WB.doubleTouch = false;
};
/* 触屏事件处理结束 */
```

## 运行项目

```bash
$ git clone https://github.com/huoyijie/tech-notes-code
$ cd tech-notes-code/whiteboard-with-socket.io && node index.js
click http://localhost:3000
```

用手机、桌面浏览器打开 http://localhost:3000 地址访问共享画板，可以在桌面浏览器中多打开几个标签页同时访问。

![whiteboard](https://cdn.huoyijie.cn/uploads/2023/07/whiteboard-socket.io-banner.png)