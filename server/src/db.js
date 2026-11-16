// Tiny document database. Everything lives in memory and is flushed to disk
// (data/db.json) or, when MONGODB_URI is set, to a single MongoDB document.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.PLUMPAY_DATA || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
const MONGO_URI = process.env.MONGODB_URI;

let db = null;
let timer = null;
let mongo = null;
let storageError = '';

async function load() {
  if (MONGO_URI) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
      await client.connect();
      mongo = client.db(process.env.MONGODB_DB || 'plumpay').collection('state');
      const doc = await mongo.findOne({ _id: 'db' });
      if (doc) db = JSON.parse(doc.json);
      else { db = require('./seed').buildSeed(); await flush(); }
      console.log('Storage: MongoDB');
      return db;
    } catch (e) {
      // Keep the app online; data then lives on local disk until MongoDB is reachable.
      mongo = null;
      storageError = e.message;
      console.error('WARNING: could not connect to MongoDB (' + e.message + '). Check the Atlas IP Access List allows 0.0.0.0/0. Using local storage for now.');
    }
  }
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } else {
    db = require('./seed').buildSeed();
    flush();
  }
  console.log('Storage: ' + FILE);
  return db;
}

function reset() {
  db = require('./seed').buildSeed();
  flush();
  return db;
}

function get() {
  return db;
}

function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 150);
}

async function flush() {
  if (mongo) {
    // Stored as a JSON string so keys like phone numbers and dots are safe.
    try { await mongo.replaceOne({ _id: 'db' }, { _id: 'db', json: JSON.stringify(db), savedAt: new Date() }, { upsert: true }); } catch (e) { console.error('Mongo save failed:', e.message); }
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const json = JSON.stringify(db, null, 1);
  const tmp = FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, FILE);
  } catch {
    // OneDrive / antivirus can lock the file during rename; fall back to a direct write.
    fs.writeFileSync(FILE, json);
  }
}

function id(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

function hashSecret(secret) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.scryptSync(String(secret), salt, 32).toString('hex');
  return salt + ':' + hash;
}

function verifySecret(secret, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(secret), salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

function digits(n) {
  let s = String(Math.floor(Math.random() * 9) + 1);
  while (s.length < n) s += Math.floor(Math.random() * 10);
  return s;
}

function token() {
  return crypto.randomBytes(24).toString('hex');
}

function status() {
  return { storage: mongo ? 'mongodb' : 'disk', mongoConfigured: !!MONGO_URI, error: storageError };
}

module.exports = { status, load, reset, get, save, flush, id, hashSecret, verifySecret, digits, token };
