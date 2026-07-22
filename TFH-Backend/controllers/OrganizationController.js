import { tfhPool } from '../config/db.js';

// Контент страницы "О федерации → Организация" — singleton (одна строка), как и contacts_info.
// 5 цифровых блоков — фиксированное количество полей в таблице, а не список, поэтому
// добавить/удалить блок через сайт нельзя — только поменять значение и подпись.

const toDto = (row) => ({
  descriptionTitle: row.description_title,
  descriptionBody: row.description_body,
  stats: [1, 2, 3, 4, 5].map((i) => ({
    value: row[`stat${i}_value`],
    label: row[`stat${i}_label`],
  })),
});

export const getOrganization = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM organization_content ORDER BY id LIMIT 1');
  res.json({ organization: rows.length ? toDto(rows[0]) : null });
};

export const updateOrganization = async (req, res) => {
  const { descriptionTitle, descriptionBody, stats } = req.body;

  if (!Array.isArray(stats) || stats.length !== 5) {
    return res.status(400).json({ message: 'Нужно ровно 5 цифровых блоков' });
  }

  const { rows: existingRows } = await tfhPool.query(
    'SELECT id FROM organization_content ORDER BY id LIMIT 1'
  );

  const values = [
    descriptionTitle,
    descriptionBody,
    stats[0].value, stats[0].label,
    stats[1].value, stats[1].label,
    stats[2].value, stats[2].label,
    stats[3].value, stats[3].label,
    stats[4].value, stats[4].label,
  ];

  const { rows } = existingRows.length
    ? await tfhPool.query(
        `UPDATE organization_content
         SET description_title = $1, description_body = $2,
             stat1_value = $3, stat1_label = $4,
             stat2_value = $5, stat2_label = $6,
             stat3_value = $7, stat3_label = $8,
             stat4_value = $9, stat4_label = $10,
             stat5_value = $11, stat5_label = $12,
             updated_at = now()
         WHERE id = $13
         RETURNING *`,
        [...values, existingRows[0].id]
      )
    : await tfhPool.query(
        `INSERT INTO organization_content
           (description_title, description_body,
            stat1_value, stat1_label, stat2_value, stat2_label,
            stat3_value, stat3_label, stat4_value, stat4_label,
            stat5_value, stat5_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        values
      );

  res.json({ organization: toDto(rows[0]) });
};
