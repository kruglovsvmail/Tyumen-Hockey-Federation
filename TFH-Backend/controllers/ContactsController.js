import { tfhPool } from '../config/db.js';

// Контакты федерации — singleton (одна строка на весь сайт), в отличие от staff_members/partners

const toDto = (row) => ({
  address: row.address,
  phone: row.phone,
  email: row.email,
  vkUrl: row.vk_url,
  ogrn: row.ogrn,
  inn: row.inn,
  legalName: row.legal_name,
});

export const getContacts = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM contacts_info ORDER BY id LIMIT 1');
  res.json({ contacts: rows.length ? toDto(rows[0]) : null });
};

export const updateContacts = async (req, res) => {
  const { address, phone, email, vkUrl, ogrn, inn, legalName } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT id FROM contacts_info ORDER BY id LIMIT 1');

  const values = [address, phone, email, vkUrl, ogrn, inn, legalName];

  const { rows } = existingRows.length
    ? await tfhPool.query(
        `UPDATE contacts_info
         SET address = $1, phone = $2, email = $3, vk_url = $4, ogrn = $5, inn = $6, legal_name = $7, updated_at = now()
         WHERE id = $8
         RETURNING *`,
        [...values, existingRows[0].id]
      )
    : await tfhPool.query(
        `INSERT INTO contacts_info (address, phone, email, vk_url, ogrn, inn, legal_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        values
      );

  res.json({ contacts: toDto(rows[0]) });
};
