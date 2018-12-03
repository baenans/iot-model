const functions = require('firebase-functions');
const {BigQuery} = require('@google-cloud/bigquery');
const {PubSub} = require('@google-cloud/pubsub');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

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

/**
 * PubSub Client
 */
const projectId = 'temp-humidity-monitoring';
const pubsubClient = new PubSub({
  projectId
});
const topicName = 'device-output';

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

exports.threeDaysReport = functions.https.onRequest((req, res) => {
  
  const query = `SELECT 
    EXTRACT(YEAR FROM timestamp) AS year,
    EXTRACT(MONTH FROM timestamp) AS month,
    EXTRACT(DAY FROM timestamp) AS day,
    AVG(temperature) AS average_temperature, 
    MIN(temperature) AS min_temperature,
    MAX(temperature) AS max_temperature, 
    AVG(humidity) AS average_humidity,
    MIN(humidity) AS min_humidity,
    MAX(humidity) AS max_humidity
  FROM device_data.telemetry 
  WHERE device_id = 'CNlmx974NM86zIfbPni2'
  AND timestamp between timestamp_sub(current_timestamp, INTERVAL 3 DAY) and current_timestamp()
  GROUP BY year, month, day
  ORDER BY year DESC, month DESC, day DESC;`;

  return bigquery
    .query({
      query: query,
      useLegacySql: false
    })
    .then(result => {
      const rows = result[0];
      return cors(req, res, () => {
        res.status(200).send(JSON.stringify(rows))
      });
    });
});

exports.onColorChanged = functions.firestore
  .document('devices/CNlmx974NM86zIfbPni2').onUpdate((change, context) => {
    const dataBuffer = Buffer.from(JSON.stringify(change.after.data()));
    return pubsubClient
      .topic(topicName)
      .publisher()
      .publish(dataBuffer);
  });