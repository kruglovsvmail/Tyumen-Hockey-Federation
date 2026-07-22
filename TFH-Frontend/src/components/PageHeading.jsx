export default function PageHeading({ title, centered }) {
  return (
    <div className={`page-heading${centered ? ' page-heading--centered' : ''}`}>
      <h2 className="page-heading__title font-display">{title}</h2>
    </div>
  );
}
