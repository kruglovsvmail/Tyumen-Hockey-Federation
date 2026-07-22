export default function StaffCard({ staff, editable, onEdit, onDelete }) {
  return (
    <div className="staff-card">
      {editable && (
        <div className="staff-card__actions">
          <button type="button" className="staff-card__action" onClick={onEdit} aria-label="Редактировать">
            ✎
          </button>
          <button
            type="button"
            className="staff-card__action staff-card__action--danger"
            onClick={onDelete}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      {staff.photoUrl ? (
        <img src={staff.photoUrl} alt="" className="staff-card__photo" />
      ) : (
        <div className="staff-card__photo staff-card__photo--placeholder" />
      )}

      <div className="staff-card__name">{staff.fullName}</div>
      <div className="staff-card__position">{staff.position}</div>
    </div>
  );
}
