let C = (() => {

  let db
  let devices = []
  let currentDevice = 0
  let limit = 100
  let unsubscribeDeviceFromSnapshots
  let ctx
  let lineChart
  let tempRead, humidRead, timeOfRead

  let initialize = () => {

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
      console.log(querySnapshot)
      querySnapshot.forEach(function(doc) {
        console.log(doc, doc.data, doc.id)
        devices.push(doc.id)
      })
      setDevice(0)
    })

    ctx = document.getElementById("linearChart").getContext('2d')

    tempRead = document.getElementById('tempRead')
    humidRead = document.getElementById('humidRead')
    timeOfRead = document.getElementById('timeOfRead')

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
                unit: 'second'
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
    tempRead.innerText = temp
    humidRead.innerText = humid
    timeOfRead.innerText = time
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

    console.log(devices, deviceId)

    if (unsubscribeDeviceFromSnapshots)
      unsubscribeDeviceFromSnapshots()

    unsubscribeDeviceFromSnapshots = firebase.firestore()
      .collection('devices')
      .doc(deviceId)
      .collection('events')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .onSnapshot(handleDeviceSnapshot)
  }

  return {
    initialize,
    nextDevice
  }
})()

window.addEventListener('DOMContentLoaded', C.initialize)