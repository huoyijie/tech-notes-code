function getWB(canvasRef, setCursor) {
  const WB = {
    // 画板元素和上下文
    canvas: null,
    cxt: null,

    // 存储所有绘画数据
    drawings: [],
    // 当前一笔笔画数据
    strokes: [],

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
    init() {
      // 获取画板上下文
      WB.canvas = canvasRef.current;
      WB.cxt = WB.canvas.getContext('2d');

      // 添加鼠标事件处理函数
      WB.canvas.addEventListener('mousedown', WB.onMouseDown);
      WB.canvas.addEventListener('mouseup', WB.onMouseUp, false);
      WB.canvas.addEventListener('mouseout', WB.onMouseUp, false);
      WB.canvas.addEventListener('mousemove', WB.onMouseMove, false);
      WB.canvas.addEventListener('wheel', WB.onMouseWheel, false);

      // 添加触屏事件处理函数
      WB.canvas.addEventListener('touchstart', WB.onTouchStart);
      WB.canvas.addEventListener('touchend', WB.onTouchEnd);
      WB.canvas.addEventListener('touchcancel', WB.onTouchEnd);
      WB.canvas.addEventListener('touchmove', WB.onTouchMove);

      // 添加同步 drawings 处理函数
      WS.onRecvDrawings = WB.onRecvDrawings;

      // 绘制画板
      WB.redraw();

      // 禁止右键
      document.oncontextmenu = () => false;

      // 窗口大小改变重新绘制画板
      window.addEventListener('resize', () => {
        WB.redraw();
      });
    },

    // 重新绘制画板
    redraw() {
      // 设置画板为窗口大小
      WB.canvas.width = document.body.clientWidth;
      WB.canvas.height = document.body.clientHeight;

      // 设置白板背景色
      WB.cxt.fillStyle = '#fff';
      WB.cxt.fillRect(0, 0, WB.canvas.width, WB.canvas.height);

      // 绘制所有笔画线段
      for (let line of WB.drawings) {
        WB.drawLine(
          WB.toX(line.x0),
          WB.toY(line.y0),
          WB.toX(line.x1),
          WB.toY(line.y1)
        );
      }
    },

    // 画线段
    drawLine(x0, y0, x1, y1) {
      WB.cxt.beginPath();
      WB.cxt.moveTo(x0, y0);
      WB.cxt.lineTo(x1, y1);
      WB.cxt.strokeStyle = '#000';
      WB.cxt.lineWidth = 2;
      WB.cxt.stroke();
    },

    /* 坐标转换函数开始 */
    toX(xL) {
      return (xL + WB.offsetX) * WB.scale;
    },

    toY(yL) {
      return (yL + WB.offsetY) * WB.scale;
    },

    toLogicX(x) {
      return (x / WB.scale) - WB.offsetX;
    },

    toLogicY(y) {
      return (y / WB.scale) - WB.offsetY;
    },

    logicHeight() {
      return WB.canvas.height / WB.scale;
    },

    logicWidth() {
      return WB.canvas.width / WB.scale;
    },
    /* 坐标转换函数结束 */

    /* 鼠标事件处理开始 */
    onMouseDown(e) {
      // 判断按键
      WB.leftMouseDown = e.button == 0;
      WB.rightMouseDown = e.button == 2;
      if (WB.leftMouseDown) {
        setCursor('crosshair');
      } else if (WB.rightMouseDown) {
        setCursor('move');
      }
      // 更新首笔笔画开始坐标
      WB.prevCursorX = e.pageX;
      WB.prevCursorY = e.pageY;
    },

    onMouseMove(e) {
      // 更新当前笔画结束坐标
      const cursorX = e.pageX;
      const cursorY = e.pageY;

      // 按住左键绘制笔画
      if (WB.leftMouseDown) {
        // 记录笔画
        WB.strokes.push({
          x0: WB.toLogicX(WB.prevCursorX),
          y0: WB.toLogicY(WB.prevCursorY),
          x1: WB.toLogicX(cursorX),
          y1: WB.toLogicY(cursorY)
        });
        // 绘制笔画
        WB.drawLine(WB.prevCursorX, WB.prevCursorY, cursorX, cursorY);
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
    },

    onMouseUp() {
      WB.leftMouseDown = false;
      WB.rightMouseDown = false;
      // 发送笔画到服务器，同步给其他用户
      WS.send(WB.strokes);
      // 保存笔画
      WB.drawings.push(...WB.strokes);
      // 清空当前笔画
      WB.strokes = [];
      setCursor(null);
    },

    onMouseWheel(e) {
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
    },
    /* 鼠标事件处理结束 */

    /* 触屏事件处理结束 */
    onTouchStart(e) {
      WB.singleTouch = e.touches.length == 1;
      // 多于 2 个触点等同于 2 个
      WB.doubleTouch = e.touches.length > 1;
      // 只记录 2 个触点坐标
      WB.prevTouches[0] = e.touches[0];
      WB.prevTouches[1] = e.touches[1];
    },

    onTouchMove(e) {
      // 获取第 1 个触点坐标
      const touch0X = e.touches[0].pageX;
      const touch0Y = e.touches[0].pageY;
      const prevTouch0X = WB.prevTouches[0].pageX;
      const prevTouch0Y = WB.prevTouches[0].pageY;

      // 一根手指绘制笔画
      if (WB.singleTouch) {
        // 记录笔画
        WB.strokes.push({
          x0: WB.toLogicX(prevTouch0X),
          y0: WB.toLogicY(prevTouch0Y),
          x1: WB.toLogicX(touch0X),
          y1: WB.toLogicY(touch0Y)
        })
        // 绘制笔画
        WB.drawLine(prevTouch0X, prevTouch0Y, touch0X, touch0Y);
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
    },

    onTouchEnd() {
      WB.singleTouch = false;
      WB.doubleTouch = false;
      // 发送笔画到服务器，同步给其他用户
      WS.send(WB.strokes);
      // 保存笔画
      WB.drawings.push(...WB.strokes);
      // 清空当前笔画
      WB.strokes = [];
    },
    /* 触屏事件处理结束 */

    // 接收服务器数据并绘制画板
    onRecvDrawings(drawings) {
      // 保存绘画数据
      WB.drawings.push(...drawings);
      // 绘制所有笔画线段
      for (let line of drawings) {
        WB.drawLine(
          WB.toX(line.x0),
          WB.toY(line.y0),
          WB.toX(line.x1),
          WB.toY(line.y1)
        );
      }
    }
  };
  return WB;
}