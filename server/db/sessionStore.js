const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, 'sessions.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function createSession(profile) {
  const db = readDB();
  const id = randomUUID();
  db[id] = {
    id,
    profile,
    questions:           [],
    answers:             [],
    skills:              [],
    recommendations:     [],
    agentRound:          0,
    // Simulation workflow fields
    simulation:          null,
    userSolution:        null,
    evaluation:          null,
    simulationScore:     null,
    finalRecommendation: null,
    createdAt: new Date().toISOString()
  };
  writeDB(db);
  return db[id];
}

function getSession(id) {
  return readDB()[id] || null;
}

function updateSession(id, patch) {
  const db = readDB();
  if (!db[id]) return null;
  db[id] = { ...db[id], ...patch };
  writeDB(db);
  return db[id];
}

module.exports = { createSession, getSession, updateSession };
