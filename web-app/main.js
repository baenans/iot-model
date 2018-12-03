let C = (() => {

  const MS_PER_MINUTE = 60000

  let db
  let devices = []
  let currentDevice = 0
  let limit = 100
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
    .then(res => { console.log(res); return res.json()}).then(data => {
      document.getElementById('reportData').innerText = JSON.stringify(data, null, 2)
    })

    document.getElementById('uColor').addEventListener('click', updateColor)
  }

  let updateColor = () => {
    let r = document.getElementById('iR').value || 0
    let g = document.getElementById('iG').value || 0
    let b = document.getElementById('iB').value || 0
    fetch(`http://127.0.0.1:8000/rgb?r=${r}&g=${g}&b=${b}`, {mode:'no-cors'})
    document.getElementById('prevColor').style.backgroundColor = `rgb(${r}, ${g}, ${b})`
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

window.addEventListener('DOMContentLoaded', C.initialize)