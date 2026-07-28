import { codeExamples } from '../data/codeExamples.js'
import { engineExamples } from '../data/engineExamples.js'

export default function ExampleSelector({ onSelect, target, source }) {
  const examples = target === 'engine-wasm' ? engineExamples : codeExamples
  const selected = examples.findIndex(example => example.code === source)

  return (
    <span className="azora-select-wrap">
      <select
        aria-label="Example"
        value={selected >= 0 ? selected : 'custom'}
        onChange={e => {
          const idx = Number(e.target.value)
          if (Number.isInteger(idx) && examples[idx]) onSelect(examples[idx].code)
        }}
        className="azora-select bg-az-80 text-az-20 border border-az-70 rounded-md px-2 py-1 text-sm
                   focus:outline-none focus:border-az-primary cursor-pointer"
      >
        {selected < 0 && <option value="custom">Custom</option>}
        {examples.map((ex, i) => (
          <option key={i} value={i}>{ex.title}</option>
        ))}
      </select>
    </span>
  )
}
