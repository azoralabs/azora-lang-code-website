
import ConsoleOutput from './ConsoleOutput.jsx'
import CodeView from './CodeView.jsx'

const ALL_TABS = [
  { id: 'console', label: 'Output' },
  { id: 'preprocessed', label: 'Azora IR' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'wasm', label: 'WebAssembly' },
  { id: 'llvm-ir', label: 'LLVM IR' },
]

const TARGET_CODE = {
  javascript: { tab: 'javascript', key: 'javascript', language: 'javascript' },
  wasm: { tab: 'wasm', key: 'wasm', language: 'wasm' },
  'llvm-ir': { tab: 'llvm-ir', key: 'llvmIr', language: 'llvm' },
}

export default function OutputPanel({ activeTab, onTabChange, results, target }) {
  const consoleMessages = results?.console || []
  const hasErrors = consoleMessages.some(m => m.type === 'error')
  const preprocessedCode = results?.preprocessed || ''
  const active = TARGET_CODE[target]

  const tabs = ALL_TABS.filter((t) =>
    t.id === 'console' || t.id === 'preprocessed' || (active != null && t.id === active.tab)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-az-80 bg-az-95 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'text-az-10'
                : 'text-az-60 hover:text-az-35'
              }`}
          >
            {tab.label}
            {tab.id === 'console' && hasErrors && (
              <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-az-red" />
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-az-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'console' && (
          <ConsoleOutput messages={consoleMessages} />
        )}
        {activeTab === 'preprocessed' && (
          <CodeView code={preprocessedCode} language="azora" />
        )}
        {active && activeTab === active.tab && (
          <CodeView code={results?.[active.key] || ''} language={active.language} />
        )}
      </div>
    </div>
  )
}
