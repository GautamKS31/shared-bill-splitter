interface HomeFormProps {
  homeName: string
  setHomeName: (value: string) => void
  loading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function HomeForm({ homeName, setHomeName, loading, onSubmit }: HomeFormProps) {
  return (
    <section className="panel welcome">
      <h2>Create your home</h2>
      <p>Start by creating a household to manage shared expenses.</p>

      <form onSubmit={onSubmit}>
        <input
          value={homeName}
          onChange={(e) => setHomeName(e.target.value)}
          placeholder="Enter home name"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Home'}
        </button>
      </form>
    </section>
  )
}
