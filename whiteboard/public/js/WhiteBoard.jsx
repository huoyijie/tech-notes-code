function WhiteBoard() {
  const { useRef, useState, useEffect } = React;
  const canvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);

  const WB = getWB(canvasRef, setCursor);

  useEffect(() => {
    WB.init();
  }, []);

  return (
    <canvas ref={canvasRef} id="canvas" className={'w-full h-full' + (cursor ? ` cursor-${cursor}` : '')}>Your browser does not support HTML5 canvas</canvas>
  );
}