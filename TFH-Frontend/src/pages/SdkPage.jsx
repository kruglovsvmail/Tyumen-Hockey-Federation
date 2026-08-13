import { useEffect, useRef, useState } from 'react';
import { apiGet, apiUpload, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import SeasonDropdown from '../components/SeasonDropdown.jsx';
import PenaltyTableCarousel from '../components/PenaltyTableCarousel.jsx';
import SdkProtocol, { formatProtocolDate } from '../components/SdkProtocol.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Loader from '../components/Loader.jsx';
// Стили пилюли выбора сезона живут там же, где появились первыми — как и в TournamentsPage
import './DivisionsPage.css';
import './SdkPage.css';

/**
 * Общая для всех дивизионов страница СДК: раньше вкладка «СДК» висела на каждом
 * дивизионе, но и таблица штрафов, и протоколы одни на сезон целиком.
 *
 * Два раздела: сверху таблица штрафов (лента картинок, наполняет админ сайта),
 * ниже — протоколы СДК, пока заглушка.
 */
export default function SdkPage() {
  const { isAdmin, token } = useAdmin();

  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingImage, setDeletingImage] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const fileInputRef = useRef(null);

  // Протоколы: слева список заседаний, справа выбранное — грузится отдельным запросом,
  // потому что в списке нужны только номер и дата, а в протоколе весь состав и решения
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [meetingLoading, setMeetingLoading] = useState(false);

  useEffect(() => {
    apiGet('/api/championship/seasons')
      .then((data) => {
        setSeasons(data.seasons);
        const initial = data.seasons.find((s) => s.isActive) || data.seasons[0];
        if (initial) setSeasonId(initial.id);
        else setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setLoading(true);
    apiGet(`/api/sdk/penalty-images?seasonId=${seasonId}`)
      .then((data) => setImages(data.images))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [seasonId]);

  // При смене сезона список протоколов перезагружается, а открытый сбрасывается:
  // протокол прошлого сезона рядом с новым списком читался бы как его часть
  useEffect(() => {
    if (!seasonId) return;
    setMeetingsLoading(true);
    setSelectedMeetingId(null);
    setMeeting(null);
    apiGet(`/api/sdk/meetings?seasonId=${seasonId}`)
      .then((data) => {
        setMeetings(data.meetings);
        setSelectedMeetingId(data.meetings[0]?.id ?? null);
      })
      .catch(() => setMeetings([]))
      .finally(() => setMeetingsLoading(false));
  }, [seasonId]);

  useEffect(() => {
    if (!selectedMeetingId) return;
    setMeetingLoading(true);
    apiGet(`/api/sdk/meetings/${selectedMeetingId}`)
      .then((data) => setMeeting(data.meeting))
      .catch(() => setMeeting(null))
      .finally(() => setMeetingLoading(false));
  }, [selectedMeetingId]);

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    // Инпут сбрасываем сразу: иначе повторный выбор того же файла не даст события
    event.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('seasonId', seasonId);
      files.forEach((file) => formData.append('images', file));
      const data = await apiUpload('/api/sdk/penalty-images', formData, token);
      setImages(data.images);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/sdk/penalty-images/${deletingImage.id}`, token);
      setImages((prev) => prev.filter((i) => i.id !== deletingImage.id));
      setDeletingImage(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Общего заголовка у страницы нет: заголовки разделов и есть её главные заголовки */}
      {error && <PlaceholderSection>Не удалось загрузить данные: {error}</PlaceholderSection>}

      {!error && (
        <>
          <section className="sdk-section">
            <div className="sdk-section__head">
              <PageHeading title="ТАБЛИЦА ШТРАФОВ" />
              {/* Выбор сезона относится ко всей странице, но живёт в строке первого
                  заголовка — отдельная строка над разделами занимала место впустую */}
              <div className="sdk-section__tools">
                {isAdmin && seasonId && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={handleFilesSelected}
                    />
                    <button
                      type="button"
                      className="sdk-section__add"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? 'Загрузка…' : '+ Добавить изображение'}
                    </button>
                  </>
                )}
                {seasons.length > 0 && (
                  <SeasonDropdown seasons={seasons} value={seasonId} onChange={setSeasonId} />
                )}
              </div>
            </div>

            {uploadError && <PlaceholderSection>Не удалось загрузить: {uploadError}</PlaceholderSection>}

            {loading ? (
              <Loader />
            ) : images.length === 0 ? (
              <PlaceholderSection>Таблица штрафов за этот сезон пока не опубликована.</PlaceholderSection>
            ) : (
              <PenaltyTableCarousel images={images} isAdmin={isAdmin} onDelete={setDeletingImage} />
            )}
          </section>

          <section className="sdk-section">
            <div className="sdk-section__head">
              <PageHeading title="ПРОТОКОЛЫ СДК" />
            </div>

            {meetingsLoading ? (
              <Loader />
            ) : meetings.length === 0 ? (
              <PlaceholderSection>В этом сезоне заседаний СДК пока не было.</PlaceholderSection>
            ) : (
              <div className="sdk-protocols">
                <nav className="sdk-protocols__list" aria-label="Протоколы СДК">
                  {meetings.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`sdk-protocols__item${m.id === selectedMeetingId ? ' is-active' : ''}`}
                      onClick={() => setSelectedMeetingId(m.id)}
                    >
                      Протокол СДК №{m.number ?? '—'} от {formatProtocolDate(m.heldAt)}
                    </button>
                  ))}
                </nav>

                {/* Пока грузится следующий протокол, предыдущий остаётся на месте и
                    только гаснет: если подменять его лоадером, высота страницы
                    схлопывается и прокрутка дёргается на каждом переключении */}
                <div className={`sdk-protocols__view${meetingLoading ? ' is-loading' : ''}`}>
                  {meeting ? (
                    <SdkProtocol meeting={meeting} />
                  ) : meetingLoading ? (
                    <Loader />
                  ) : (
                    <PlaceholderSection>Не удалось загрузить протокол.</PlaceholderSection>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {deletingImage && (
        <ConfirmDialog
          title="Удалить изображение?"
          message={`Изображение будет удалено без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingImage(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
