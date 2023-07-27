function WhiteBoard() {
  const { useRef, useState, useEffect } = React;
  const canvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  useEffect(() => {
    WB.init(canvasRef, setCursor);
  }, []);

  const className = (color) => {
    let colorBlock = 'inline-block w-16 h-16';
    if (selectedColor === color) {
      colorBlock += ' border-4 border-white';
    }
    if (color === 'black') {
      colorBlock += ' bg-black';
    } else {
      colorBlock += ` bg-${color}-500`;
    }
    return colorBlock;
  };
  const selectColor = (color) => {
    WB.setColor(color);
    setSelectedColor(color);
  };
  return (
    <React.Fragment>
      <canvas ref={canvasRef} id="canvas" className={'w-full h-full' + (cursor ? ` cursor-${cursor}` : '')}>Your browser does not support HTML5 canvas</canvas>
      <div className="fixed top-0 left-0">
        <div className={className('black')} onClick={() => selectColor('black')}></div>
        <div className={className('red')} onClick={() => selectColor('red')}></div>
        <div className={className('green')} onClick={() => selectColor('green')}></div>
        <div className={className('blue')} onClick={() => selectColor('blue')}></div>
        <div className={className('yellow')} onClick={() => selectColor('yellow')}></div>
      </div>
    </React.Fragment>
  );
}