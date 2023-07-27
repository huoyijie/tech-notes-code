// React App
function App() {
  return (
    <React.StrictMode>
      <WhiteBoard />
    </React.StrictMode>
  );
}

// 挂载 React App
const app = document.querySelector('#app');
const root = ReactDOM.createRoot(app);
root.render(<App />);