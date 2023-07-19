function WhiteBoard() {
  const { useRef, useEffect } = React;
  const canvasRef = useRef(null);

  const WB = getWB();

  useEffect(() => {
    WB.init(canvasRef.current);
  }, []);

  return (
    <canvas ref={canvasRef} id="canvas" className="w-full h-full">Your browser does not support HTML5 canvas</canvas>
  );
}