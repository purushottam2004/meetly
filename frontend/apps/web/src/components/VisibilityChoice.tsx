export function VisibilityChoice({
  isPublic,
  onChange,
}: {
  isPublic: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="visibility-choice" role="group" aria-label="Visibility">
      <button type="button" className={isPublic ? 'on' : ''} onClick={() => onChange(true)}>
        Public
      </button>
      <button type="button" className={!isPublic ? 'on' : ''} onClick={() => onChange(false)}>
        Hidden
      </button>
    </div>
  )
}
