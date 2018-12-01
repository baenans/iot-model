const functions = require('firebase-functions');
const {BigQuery} = require('@google-cloud/bigquery');
const admin = require('firebase-admin');

/**
 * Firestore Client
 */
const app = admin.initializeApp(functions.config().firebase);
const firestore = app.firestore();
firestore.settings({ timestampsInSnapshots: true });

/**
 * BigQuery Client
 */
const bigquery = new BigQuery();
const dataset = bigquery.dataset('device_data');
const table = dataset.table('telemetry');

exports.ingestDeviceData = functions.pubsub.topic('device-ingest').onPublish((message) => {
  const payload = message.json;
  return Promise.all([
    insertIntoBigquery(payload),
    insertIntoFirestore(payload)
  ]);
});

function insertIntoBigquery(data) {
  return table.insert(data);
}

function insertIntoFirestore(data) {
  let newData = {
    temperature: data.temperature,
    humidity: data.humidity,
    timestamp: new Date(data.timestamp * 1000)
  }
  return firestore
    .collection(`devices/${data.device_id}/events`)
    .add(newData)
}
