import type { Home } from '../api/billApi'

interface HomeSelectorProps {
  homes: Home[]
  selectedHomeId: string
  onChange: (homeId: string) => void
  onCreateNew: () => void
}

export default function HomeSelector({
  homes,
  selectedHomeId,
  onChange,
  onCreateNew,
}: HomeSelectorProps) {
  return (
    <section className="panel home-selector">
      <div>
        <h2>Your Homes</h2>
        <p>Switch between your households or create a new one.</p>
      </div>

      <select value={selectedHomeId} onChange={(e) => onChange(e.target.value)}>
        {homes.map((home) => (
          <option key={home.id} value={home.id}>
            {home.name}
          </option>
        ))}
      </select>

      <button type="button" onClick={onCreateNew}>
        + Create New Home
      </button>
    </section>
  )
}
