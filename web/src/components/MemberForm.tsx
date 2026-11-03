import type { Member } from '../api/billApi'

interface MemberFormProps {
  memberName: string
  setMemberName: (value: string) => void
  members: Member[]
  loading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function MemberForm({
  memberName,
  setMemberName,
  members,
  loading,
  onSubmit,
}: MemberFormProps) {
  return (
    <div className="panel">
      <h2>Add Member</h2>

      <form onSubmit={onSubmit}>
        <input
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder="Member name"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </form>

      <h3>Members</h3>

      {members.length === 0 ? (
        <p className="empty">No members added yet.</p>
      ) : (
        members.map((member) => (
          <div className="list-row" key={member.id}>
            <span>{member.name}</span>
          </div>
        ))
      )}
    </div>
  )
}
