const API_URL = import.meta.env.VITE_API_URL;

export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Запрос ${path} завершился с ошибкой ${res.status}`);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Запрос ${path} завершился с ошибкой ${res.status}`);
  }
  return data;
}

// multipart/form-data — для создания/редактирования с загрузкой файла. Content-Type для
// FormData браузер выставляет сам (с нужным boundary), поэтому его тут не задаём.
export async function apiUpload(path, formData, token, method = 'POST') {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Запрос ${path} завершился с ошибкой ${res.status}`);
  }
  return data;
}

// JSON-запрос с методом (PUT/PATCH и т.п.) и токеном админа, без файлов — для singleton-разделов
// вроде контактов, где не нужна multipart-загрузка.
export async function apiSendJson(path, method, body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Запрос ${path} завершился с ошибкой ${res.status}`);
  }
  return data;
}

export async function apiDelete(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Запрос ${path} завершился с ошибкой ${res.status}`);
  }
  return data;
}
