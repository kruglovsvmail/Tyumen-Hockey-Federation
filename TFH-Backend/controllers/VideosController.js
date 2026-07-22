import { tfhPool } from '../config/db.js';

// Три поддерживаемые площадки — определяем по домену в ссылке, парсим свой ID для каждой,
// собираем embed-адрес плеера. Добавить новую площадку — дописать ещё один объект сюда.
const PLATFORMS = [
  {
    platform: 'vk',
    hostPattern: /vk(video)?\.(ru|com)/i,
    // https://vkvideo.ru/video-21834628_456239076 — owner_id (может быть отрицательным) + video_id
    parse: (url) => {
      const m = /video(-?\d+)_(\d+)/.exec(url);
      return m ? `${m[1]}_${m[2]}` : null;
    },
    embedUrl: (externalId) => {
      const [oid, id] = externalId.split('_');
      return `https://vkvideo.ru/video_ext.php?oid=${oid}&id=${id}`;
    },
  },
  {
    platform: 'youtube',
    hostPattern: /(youtube\.com|youtu\.be)/i,
    // watch?v=ID, youtu.be/ID, embed/ID, shorts/ID
    parse: (url) => {
      const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/.exec(url);
      return m ? m[1] : null;
    },
    embedUrl: (externalId) => `https://www.youtube.com/embed/${externalId}`,
  },
  {
    platform: 'rutube',
    hostPattern: /rutube\.ru/i,
    // rutube.ru/video/ID/ или rutube.ru/play/embed/ID
    parse: (url) => {
      const m = /rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/.exec(url);
      return m ? m[1] : null;
    },
    embedUrl: (externalId) => `https://rutube.ru/play/embed/${externalId}`,
  },
];

const parseVideoUrl = (url) => {
  if (!url) return null;
  for (const p of PLATFORMS) {
    if (p.hostPattern.test(url)) {
      const externalId = p.parse(url);
      if (externalId) return { platform: p.platform, externalId };
    }
  }
  return null;
};

const buildEmbedUrl = (platform, externalId) => {
  const p = PLATFORMS.find((x) => x.platform === platform);
  return p ? p.embedUrl(externalId) : null;
};

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  platform: row.platform,
  embedUrl: buildEmbedUrl(row.platform, row.external_id),
});

const PAGE_SIZE = 20;

export const getVideos = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    tfhPool.query('SELECT * FROM videos ORDER BY id DESC LIMIT $1 OFFSET $2', [PAGE_SIZE, offset]),
    tfhPool.query('SELECT COUNT(*)::int AS count FROM videos'),
  ]);

  const total = countRows[0].count;

  res.json({
    videos: rows.map(toDto),
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
};

export const createVideo = async (req, res) => {
  const { title, description, url } = req.body;
  if (!title || !url) {
    return res.status(400).json({ message: 'Укажите название и ссылку на видео' });
  }

  const parsed = parseVideoUrl(url);
  if (!parsed) {
    return res.status(400).json({
      message: 'Не удалось распознать ссылку. Поддерживаются VK Видео, YouTube и RuTube — вставьте адрес страницы видео.',
    });
  }

  const { rows } = await tfhPool.query(
    'INSERT INTO videos (title, description, platform, external_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [title, description || null, parsed.platform, parsed.externalId]
  );

  res.status(201).json({ video: toDto(rows[0]) });
};

export const updateVideo = async (req, res) => {
  const { id } = req.params;
  const { title, description, url } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM videos WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Видео не найдено' });
  }

  let platform = existing.platform;
  let externalId = existing.external_id;
  if (url) {
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      return res.status(400).json({
        message: 'Не удалось распознать ссылку. Поддерживаются VK Видео, YouTube и RuTube.',
      });
    }
    platform = parsed.platform;
    externalId = parsed.externalId;
  }

  const { rows } = await tfhPool.query(
    'UPDATE videos SET title = $1, description = $2, platform = $3, external_id = $4 WHERE id = $5 RETURNING *',
    [title || existing.title, description ?? existing.description, platform, externalId, id]
  );

  res.json({ video: toDto(rows[0]) });
};

export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM videos WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Видео не найдено' });
  }
  res.status(204).send();
};
