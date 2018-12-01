const functions = require('firebase-functions');
const {BigQuery} = require('@google-cloud/bigquery');
const {google} = require('googleapis');
const admin = require('firebase-admin');

/**
 * Firestore Client
 */
const app = admin.initializeApp(functions.config().firebase);
const firestore = app.firestore();

/**
 * BigQuery Client
 */
const bigquery = new BigQuery();
const dataset = bigquery.dataset('device_data');
const table = dataset.table('telemetry');

/**
 * Spreadsheets Client
 */
const spreadsheetId = '1EJVpDQ_3CdM-13LCWP6bgDRpxviZ4ZtCcu1yNSEvMxY';
const sheets = google.sheets('v4');

const jwtClient = new google.auth.JWT({
  email: functions.config().service_account.email,
  key: functions.config().service_account.private_key,
  scopes: [ 'https://www.googleapis.com/auth/spreadsheets' ]
})

exports.ingestDeviceData = functions.pubsub.topic('device-ingest').onPublish((message) => {
  const payload = message.json;
  return Promise.all([
    insertIntoBigquery(payload),
    insertIntoFirestore(payload),
    insertIntoGoogleSheets(payload)
  ]);
});

function insertIntoBigquery(data) {
  return table.insert(data);
}

function insertIntoFirestore(data) {
  console.log(data)
  let newData = {
    temperature: data.temperature,
    humidity: data.humidity,
    timestamp: data.timestamp
  }
  return firestore
    .collection(`devices/${data.device_id}/events`)
    .add(newData)
}

function insertIntoGoogleSheets(data) {
  const dateFormula = '=A:A/60/60/24 + DATE(1970,1,1)';
  const tempVals = [[data.timestamp, data.temperature, dateFormula]];
  const humVals = [[data.timestamp, data.humidity, dateFormula]];
  return jwtClient.authorize().then(_ => {
    return Promise.all([
      sheets.spreadsheets.values.append({
        auth: jwtClient,
        spreadsheetId: spreadsheetId,
        range: 'Temperature!A:C',  // append temperature
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: tempVals }
      }, {}),
      sheets.spreadsheets.values.append({
        auth: jwtClient,
        spreadsheetId: spreadsheetId,
        range: 'Humidity!A:C',  // append humidity
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: humVals }
      }, {})
    ]);
  })
}