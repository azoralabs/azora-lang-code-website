
export const TARGETS = [
  { id: 'interpreted', label: 'Interpreter' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'wasm', label: 'WebAssembly' },
  { id: 'llvm-ir', label: 'LLVM IR' },
]

export const TARGET_IDS = TARGETS.map(t => t.id)

export default function TargetSelector({ target, onChange }) {
  return (
    <span className="azora-select-wrap">
      <select
        value={target}
        onChange={(e) => onChange(e.target.value)}
        className="azora-select bg-az-80 text-az-20 border border-az-70 rounded-md px-2 py-1 text-sm font-mono
                   focus:outline-none focus:border-az-primary cursor-pointer"
      >
        {TARGETS.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </span>
  )
}
