import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.data', 'devdb.json');

function load() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { kv: {}, sets: {}, expires: {} };
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let queue = Promise.resolve();
function serialize(fn) {
  const result = queue.then(fn);
  queue = result.then(() => {}, () => {});
  return result;
}

function isExpired(db, key) {
  const exp = db.expires[key];
  return exp && Date.now() > exp;
}

export const fileStore = {
  async get(key) {
    return serialize(() => {
      const db = load();
      if (isExpired(db, key)) {
        delete db.kv[key];
        delete db.expires[key];
        save(db);
        return null;
      }
      return db.kv[key] ?? null;
    });
  },

  async set(key, value, opts) {
    return serialize(() => {
      const db = load();
      db.kv[key] = value;
      if (opts && opts.ex) {
        db.expires[key] = Date.now() + opts.ex * 1000;
      } else {
        delete db.expires[key];
      }
      save(db);
      return 'OK';
    });
  },

  async del(key) {
    return serialize(() => {
      const db = load();
      delete db.kv[key];
      delete db.expires[key];
      delete db.sets[key];
      if (db.lists) delete db.lists[key];
      save(db);
      return 1;
    });
  },

  async rpush(key, value) {
    return serialize(() => {
      const db = load();
      if (!db.lists) db.lists = {};
      if (!db.lists[key]) db.lists[key] = [];
      db.lists[key].push(value);
      save(db);
      return db.lists[key].length;
    });
  },

  async lrange(key) {
    return serialize(() => {
      const db = load();
      return (db.lists && db.lists[key]) || [];
    });
  },

  async sadd(key, member) {
    return serialize(() => {
      const db = load();
      if (!db.sets[key]) db.sets[key] = [];
      if (!db.sets[key].includes(member)) db.sets[key].push(member);
      save(db);
      return 1;
    });
  },

  async smembers(key) {
    return serialize(() => {
      const db = load();
      return db.sets[key] || [];
    });
  },

  async srem(key, member) {
    return serialize(() => {
      const db = load();
      if (db.sets[key]) {
        db.sets[key] = db.sets[key].filter((m) => m !== member);
      }
      save(db);
      return 1;
    });
  },
};
