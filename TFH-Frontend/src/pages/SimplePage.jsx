import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';

export default function SimplePage({ title }) {
  return (
    <div className="page-container">
      <PageHeading title={title} />
      <PlaceholderSection />
    </div>
  );
}
