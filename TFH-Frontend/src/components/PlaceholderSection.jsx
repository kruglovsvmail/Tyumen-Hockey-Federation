export default function PlaceholderSection({ children }) {
  return (
    <div className="glass-card placeholder-card">
      <p>{children || 'Раздел в разработке — содержимое появится позже.'}</p>
    </div>
  );
}
