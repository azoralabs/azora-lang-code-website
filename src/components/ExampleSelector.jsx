import { useState } from 'react'
import { codeExamples } from '../data/codeExamples.js'

export default function ExampleSelector({ onSelect }) {
  const [selected, setSelected] = useState(0)

  return (
    <span className="azora-select-wrap">
      <select
        aria-label="Example"
        value={selected}
        onChange={e => {
          const idx = Number(e.target.value)
          setSelected(idx)
          onSelect(codeExamples[idx].code)
        }}
        className="azora-select bg-az-80 text-az-20 border border-az-70 rounded-md px-2 py-1 text-sm
                   focus:outline-none focus:border-az-primary cursor-pointer"
      >
        {codeExamples.map((ex, i) => (
          <option key={i} value={i}>{ex.title}</option>
        ))}
      </select>
    </span>
  )
}
