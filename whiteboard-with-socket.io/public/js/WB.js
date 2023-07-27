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
  // socket.io 连接
  socket: null,

  // 画板元素和上下文
  canvas: null,
  cxt: null,
  setCursor: null,

  // 画笔颜色
  pen: {
    color: 'black',
    size: 2,
  },
  // 存储所有绘画数据
  drawings: [],

  // 位移
  offsetX: 0,
  offsetY: 0,

  // 伸缩因子
  scale: 1,

  // 鼠标
  prevCursorX: 0,
  prevCursorY: 0,
  leftMouseDown: false,
  rightMouseDown: false,

  // 触屏(最多支持 2 个触点)
  prevTouches: [null, null],
  singleTouch: false,
  doubleTouch: false,

  // 初始画板
  init(canvasRef, setCursor) {
    const that = this;
    // 获取画板上下文
    this.canvas = canvasRef.current;
    this.cxt = this.canvas.getContext('2d');
    this.setCursor = setCursor;

    // 添加鼠标事件处理函数
    this.canvas.addEventListener('mousedown', onMouseDown, false);
    this.canvas.addEventListener('mouseup', onMouseUp, false);
    this.canvas.addEventListener('mouseout', onMouseUp, false);
    this.canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
    this.canvas.addEventListener('wheel', throttle(onMouseWheel, 10), false);

    // 添加触屏事件处理函数
    this.canvas.addEventListener('touchstart', onTouchStart, false);
    this.canvas.addEventListener('touchend', onTouchEnd, false);
    this.canvas.addEventListener('touchcancel', onTouchEnd, false);
    this.canvas.addEventListener('touchmove', throttle(onTouchMove, 10), false);

    // 建立 socket.io 连接
    this.socket = io();
    this.socket.on('drawing', (drawing) => {
      that.onRecvDrawing(drawing);
    });
    // 关闭页面时，同步关闭 socket.io 连接
    window.onbeforeunload = () => {
      that.socket.disconnect();
    };
    // 窗口大小改变重新绘制画板
    window.addEventListener('resize', () => {
      that.redraw();
    }, false);
    // 禁止右键
    document.oncontextmenu = () => false;

    // 绘制画板
    this.redraw();
  },

  // 设置画笔颜色
  setColor(color) {
    this.pen.color = color;
  },

  // 重新绘制画板
  redraw() {
    // 设置画板为窗口大小
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    // 设置白板背景色
    this.cxt.fillStyle = '#fff';
    this.cxt.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制所有笔画线段
    for (let drawing of this.drawings) {
      this.drawLine(
        drawing.pen,
        this.toX(drawing.x0),
        this.toY(drawing.y0),
        this.toX(drawing.x1),
        this.toY(drawing.y1)
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
  toX(xL) {
    return (xL + this.offsetX) * this.scale;
  },

  toY(yL) {
    return (yL + this.offsetY) * this.scale;
  },

  toLogicX(x) {
    return (x / this.scale) - this.offsetX;
  },

  toLogicY(y) {
    return (y / this.scale) - this.offsetY;
  },

  logicHeight() {
    return this.canvas.height / this.scale;
  },

  logicWidth() {
    return this.canvas.width / this.scale;
  },
  /* 坐标转换函数结束 */

  // 接收服务器数据并绘制画板
  onRecvDrawing(drawing) {
    // 保存绘画数据
    this.drawings.push(drawing);
    // 绘制笔划
    this.drawLine(
      drawing.pen,
      this.toX(drawing.x0),
      this.toY(drawing.y0),
      this.toX(drawing.x1),
      this.toY(drawing.y1)
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
  // 更新首笔笔画开始坐标
  WB.prevCursorX = e.pageX;
  WB.prevCursorY = e.pageY;
};

const onMouseMove = (e) => {
  // 更新当前笔画结束坐标
  const cursorX = e.pageX;
  const cursorY = e.pageY;

  // 按住左键绘制笔划
  if (WB.leftMouseDown) {
    const drawing = {
      pen: WB.pen,
      x0: WB.toLogicX(WB.prevCursorX),
      y0: WB.toLogicY(WB.prevCursorY),
      x1: WB.toLogicX(cursorX),
      y1: WB.toLogicY(cursorY)
    };
    // 保存笔划
    WB.drawings.push(drawing);
    // 发送笔画到服务器，同步给其他用户
    WB.socket.emit('drawing', drawing);
    // 绘制笔划
    WB.drawLine(WB.pen, WB.prevCursorX, WB.prevCursorY, cursorX, cursorY);
  }

  // 按住右键移动画板
  if (WB.rightMouseDown) {
    WB.offsetX += (cursorX - WB.prevCursorX) / WB.scale;
    WB.offsetY += (cursorY - WB.prevCursorY) / WB.scale;
    // 每移动一点都重新绘制画板
    WB.redraw();
  }

  // 更新下一笔画开始坐标
  WB.prevCursorX = cursorX;
  WB.prevCursorY = cursorY;
};

const onMouseUp = (e) => {
  WB.leftMouseDown = false;
  WB.rightMouseDown = false;
  WB.setCursor(null);
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

/* 触屏事件处理结束 */
const onTouchStart = (e) => {
  WB.singleTouch = e.touches.length == 1;
  // 多于 2 个触点等同于 2 个
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