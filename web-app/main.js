/**
 * Imported from David Walsh's Blog // https://davidwalsh.name/javascript-debounce-function
 */
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

let controller = (() => {

  const MS_PER_MINUTE = 60000

  let db
  let devices = []
  let currentDevice = 0
  let unsubscribeDeviceFromSnapshots
  let ctx
  let lineChart
  let timeOfRead
  let tempGauge, humidGauge
  let minutesToQuery = 5
  let timeUnit = 'minute'
  let minimumTimestamp = new Date(new Date() - minutesToQuery * MS_PER_MINUTE)

  let initialize = () => {

    tempGauge = new JustGage({
      id: "tempGauge",
      value: 0,
      min: 0,
      max: 100,
      title: "Temperature",
      label: "C"
    })

    humidGauge = new JustGage({
      id: "humidGauge",
      value: 0,
      min: 0,
      max: 100,
      title: "Humidity",
      label: "%"
    })

    firebase.initializeApp({
      apiKey: "AIzaSyCePuF7C7WqJ5LP1bL6wqP09X6QZsyXWpw",
      authDomain: "temp-humidity-monitoring.firebaseapp.com",
      databaseURL: "https://temp-humidity-monitoring.firebaseio.com",
      projectId: "temp-humidity-monitoring",
      storageBucket: "temp-humidity-monitoring.appspot.com",
      messagingSenderId: "114078303303"
    })

    db = firebase.firestore()
    db.settings({timestampsInSnapshots: true});
    db.collection("devices").get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        devices.push(doc.id)
      })
      setDevice(0)
    })

    ctx = document.getElementById("linearChart").getContext('2d')

    timeOfRead = document.getElementById('timeOfRead')

    var radios = document.forms["intervals"].elements["timeQuery"]
    for(var i = 0, max = radios.length; i < max; i++) {
      radios[i].addEventListener('click', (e) => {changeGraphDisplayInterval(e.target.value)} )
    }

    fetch('https://us-central1-temp-humidity-monitoring.cloudfunctions.net/threeDaysReport')
    .then(res => res.json()).then(metrics => {

      let reportDataDiv = document.getElementById('reportData')

      metrics.forEach(met => {
        let metricTemplate = `
          <div style='display: inline-block; padding: 8px 10px;'>
            <div style='font-size: 14px; margin-bottom: 5px'>${met.day}/${met.month}/${met.year}</div>
            <div><b>Temperature</b></div>
            <div>Min: ${met.min_temperature.toFixed(2)} Max: ${met.max_temperature.toFixed(2)} Avg: ${met.average_temperature.toFixed(2)}</div>
            <div><b>Humidity</b></div>
            <div>Min: ${met.min_humidity.toFixed(2)} Max: ${met.max_humidity.toFixed(2)} Avg: ${met.average_humidity.toFixed(2)}</div>
          </div>`
          reportDataDiv.innerHTML += metricTemplate
      })

    })

    document.getElementById('rgbaLedColor').addEventListener('change', debounce(updateColor, 150))
  }

  let updateColor = (e) => {
    let value = e.target.value
      .match(/[A-Za-z0-9]{2}/g)
      .map(v => parseInt(v, 16))

    let [red, green, blue] = value;

    db.collection("devices").doc(devices[currentDevice]).set({
      red,
      green,
      blue
    }) 
  }

  let changeGraphDisplayInterval = (value) => {

    switch(value) {
      case 'last_minute':
        minutesToQuery = 1
        timeUnit = 'second'
        break;
      case 'last_half_hour':
        minutesToQuery = 30
        timeUnit = 'minute'
        break;
      case 'last_hour':
        minutesToQuery = 60
        timeUnit = 'minute'
        break;
      case 'last_twelve_hours':
        minutesToQuery = 60 * 12
        timeUnit = 'hour'
        break;
      case 'last_day':
        minutesToQuery = 60 * 24
        timeUnit = 'hour'
        break;
      case 'last_seven_days':
        minutesToQuery = 60 * 24 * 3
        timeUnit = 'day'
        break;
      default:
        minutesToQuery = 5
        timeUnit = 'minute'
    }
    minimumTimestamp = new Date(new Date() - minutesToQuery * MS_PER_MINUTE)
    getDeviceData()
  }

  let setDevice = (idx) => {
    currentDevice = idx
    getDeviceData()
  }

  let nextDevice = () => {
    setDevice((currentDevice + 1) % devices.length)
  }

  let chartTemperatureAndHumidityData = (temperature, humidity) => {
    if (lineChart)
      lineChart.destroy()

    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
          datasets: [{
              label: 'Temperature',
              data: temperature,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255,99,132,1)',
              borderWidth: 1
          },
          {
            label: 'Humidity',
            data: humidity,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
      },
      options: {
        animation: false,
        scales: {
          xAxes: [{
            type: 'time',
            time: {
              unit: timeUnit
            }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              steps: 15,
              stepValue: 5,
              max: 100
            }
          }]
        }
      }
    })
  }

  let updateLatestValues = (temp, humid, time) => {
    timeOfRead.innerText = time
    tempGauge.refresh(temp)
    humidGauge.refresh(humid)
  }

  let handleDeviceSnapshot = (snapshot) => {
    let temperature = []
    let humidity = []
    snapshot.forEach(function(doc) {
      const data = doc.data()
      const date = data.timestamp.toDate()
      temperature.push({x: date, y: data.temperature})
      humidity.push({x: date, y: data.humidity})
    })
    chartTemperatureAndHumidityData(temperature.reverse(), humidity.reverse())
    let lastItem = temperature.length - 1
    updateLatestValues(
      temperature[lastItem].y,
      humidity[lastItem].y,
      temperature[lastItem].x
    )
  }

  let getDeviceData = async () => {
    let deviceId = devices[currentDevice]

    if (unsubscribeDeviceFromSnapshots)
      unsubscribeDeviceFromSnapshots()

    unsubscribeDeviceFromSnapshots = firebase.firestore()
      .collection('devices')
      .doc(deviceId)
      .collection('events')
      .where("timestamp", ">=", minimumTimestamp)
      .orderBy('timestamp', 'desc')
      .onSnapshot(handleDeviceSnapshot)
  }

  return {
    initialize,
    nextDevice
  }
})()

window.addEventListener('DOMContentLoaded', controller.initialize)