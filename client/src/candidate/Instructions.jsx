export default function Instructions() {
  const start = () => {
    document.documentElement.requestFullscreen();
    window.location.href = "/exam";
  };

  return (
    <div>
      <h2>Instructions</h2>
      <ul>
        <li>Do not refresh</li>
        <li>No tab switching</li>
        <li>Exam auto submits</li>
      </ul>
      <button onClick={start}>I AM READY</button>
    </div>
  );
}
