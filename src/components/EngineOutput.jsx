import ConsoleOutput from './ConsoleOutput.jsx'

export default function EngineOutput({ mountRef, messages, ready, error }) {
  return (
    <div className="engine-output">
      <div className="engine-viewport" ref={mountRef}>
        {!ready && !error && <div className="engine-viewport-status">Loading Engine WASM...</div>}
        {error && <div className="engine-viewport-status is-error">{error}</div>}
      </div>
      <div className="engine-console">
        <div className="engine-console-title">Console</div>
        <div className="engine-console-content">
          <ConsoleOutput messages={messages} />
        </div>
      </div>
    </div>
  )
}
