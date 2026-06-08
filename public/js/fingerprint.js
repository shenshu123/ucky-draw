const STORAGE_KEY = 'lucky_draw_user_id';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}

function getUserId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
