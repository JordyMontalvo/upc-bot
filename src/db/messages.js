const { getDb } = require('./connection');

async function saveMessage(phoneNumber, message) {
  const db = getDb();
  const result = await db.collection('messages').insertOne({
    phoneNumber,
    message,
    createdAt: new Date()
  });
  return result.insertedId;
}

async function getMessages(phoneNumber) {
  const db = getDb();
  return db.collection('messages')
    .find({ phoneNumber })
    .sort({ createdAt: -1 })
    .toArray();
}

module.exports = {
  saveMessage,
  getMessages
};
