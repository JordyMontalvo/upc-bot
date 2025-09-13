const { getDb } = require('./connection');

async function saveContact(phoneNumber) {
  const db = getDb();
  const result = await db.collection('contacts').updateOne(
    { phoneNumber },
    { $set: { lastSeen: new Date() } },
    { upsert: true }
  );
  return result.upsertedId || phoneNumber;
}

async function contactExists(phoneNumber) {
  const db = getDb();
  const contact = await db.collection('contacts').findOne({ phoneNumber });
  return !!contact;
}

module.exports = {
  saveContact,
  contactExists
};
