// Обозначения обязательной экипировки задаются в настройках лиги.
// «ушк» включает капу и имеет приоритет; вратарям отметки не ставятся.
const EQUIPMENT_MARK_LABELS = {
  ushk: { code: 'ушк', title: 'Уши, шея, капа', text: 'Игроку нужна защита ушей и шеи, а также капа.' },
  mouthguard: { code: 'к', title: 'Капа', text: 'Игроку нужна капа.' },
};

// Дату разбираем без Date, чтобы не получить сдвиг дня из-за часового пояса.
function fullYearsOld(birthDate) {
  const iso = String(birthDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - year;
  const hadBirthday = (now.getMonth() + 1 > month) || (now.getMonth() + 1 === month && now.getDate() >= day);
  return hadBirthday ? age : age - 1;
}

export function getEquipmentMark(birthDate, settings, position) {
  if (!settings || position === 'goalie') return null;
  const iso = String(birthDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  if (settings.ushkEnabled) {
    const maxAge = Number(settings.ushkMaxAge ?? 20);
    const age = fullYearsOld(iso);
    if (age !== null && age < maxAge) {
      return { ...EQUIPMENT_MARK_LABELS.ushk, text: `${EQUIPMENT_MARK_LABELS.ushk.text} Правило действует до ${maxAge} лет.` };
    }
  }

  if (settings.mouthguardEnabled) {
    const bornAfter = String(settings.mouthguardBornAfter || '').slice(0, 10);
    if (bornAfter && iso > bornAfter) {
      const [y, m, d] = bornAfter.split('-');
      return { ...EQUIPMENT_MARK_LABELS.mouthguard, text: `${EQUIPMENT_MARK_LABELS.mouthguard.text} Правило действует для родившихся после ${d}.${m}.${y}.` };
    }
  }

  return null;
}
