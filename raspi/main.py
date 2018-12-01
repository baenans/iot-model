import json, time
import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
import sensorevent_pb2
from google.cloud import pubsub_v1


class HubDevice:
  def __init__(self):
    self.CLOUD_PUBSUB_PUBLISHER = pubsub_v1.PublisherClient()
    self.CLOUD_PUBSUB_TOPIC_NAME = self.CLOUD_PUBSUB_PUBLISHER.topic_path('temp-humidity-monitoring', 'device-ingest')

    # GPIO
    self.BUZZER = 23
    self.TEMP_LED_RED = 5
    self.TEMP_LED_YELLOW = 6
    self.TEMP_LED_GREEN = 13
    self.HUMI_LED_RED = 17
    self.HUMI_LED_GREEN = 27
    self.HUMI_LED_BLUE = 22

    self.CLOUD_REFRESH_INTERVAL = 15
    self.last_cloud_refresh = 0

    self.MQTT_CLIENT = mqtt.Client("hub-device")
    self.MQTT_CLIENT.on_connect = self.on_connect
    self.MQTT_CLIENT.on_message = self.on_message
    self.MQTT_CLIENT.connect("localhost", 1883)
    self.configureGPIO()
    self.MQTT_CLIENT.loop_forever()

  def on_connect(self, client, userdata, flags, rc):
    self.MQTT_CLIENT.subscribe("events", 2)

  def send_to_the_clouds(self, data):
    min_refresh = self.last_cloud_refresh + self.CLOUD_REFRESH_INTERVAL
    print min_refresh
    print data['timestamp']
    print data['timestamp'] >= min_refresh
    print data
    if data['timestamp'] >= min_refresh:
      json_data = json.dumps(data)
      self.CLOUD_PUBSUB_PUBLISHER.publish(self.CLOUD_PUBSUB_TOPIC_NAME, json_data)
      self.last_cloud_refresh = data.timestamp
      print json_data

  def _updateTempLeds(self, green, yellow, red):
    GPIO.output(self.TEMP_LED_GREEN, GPIO.HIGH if green else GPIO.LOW)
    GPIO.output(self.TEMP_LED_YELLOW, GPIO.HIGH if yellow else GPIO.LOW)
    GPIO.output(self.TEMP_LED_RED, GPIO.HIGH if red else GPIO.LOW)

  def _updateHumiLeds(self, blue, green, red):
    GPIO.output(self.HUMI_LED_BLUE, GPIO.HIGH if blue else GPIO.LOW)
    GPIO.output(self.HUMI_LED_GREEN, GPIO.HIGH if green else GPIO.LOW)
    GPIO.output(self.HUMI_LED_RED, GPIO.HIGH if red else GPIO.LOW)

  def _updateDashboard(self, temp, humi):
    if    temp < 20:
      self._updateTempLeds(True, False, False)
    elif  temp >= 20 and temp < 30:
      self._updateTempLeds(False, True, False)
    else:
      self._updateTempLeds(False, False, True)

    if   humi < 40:
      self._updateHumiLeds(True, False, False)
    elif humi >= 40 and humi < 70:
      self._updateHumiLeds(False, True, False)
    else:
      self._updateHumiLeds(False, False, True)

  def on_message(self, client, userdata, msg):
    print "message"
    event = sensorevent_pb2.SensorEvent()
    event.ParseFromString(msg.payload)
    self._updateDashboard(event.temperature, event.humidity)
    self.send_to_the_clouds({
      'timestamp': event.timestamp,
      'temperature': event.temperature,
      'humidity': event.humidity,
      'device_id': event.deviceId
    })

  def configureGPIO(self):
    GPIO.setmode(GPIO.BCM)

    GPIO.setup(self.TEMP_LED_RED, GPIO.OUT)
    GPIO.setup(self.TEMP_LED_YELLOW, GPIO.OUT)
    GPIO.setup(self.TEMP_LED_GREEN, GPIO.OUT)
    GPIO.setup(self.HUMI_LED_BLUE, GPIO.OUT)
    GPIO.setup(self.HUMI_LED_GREEN, GPIO.OUT)
    GPIO.setup(self.HUMI_LED_RED, GPIO.OUT)

    GPIO.output(self.TEMP_LED_RED, GPIO.LOW)
    GPIO.output(self.TEMP_LED_YELLOW, GPIO.LOW)
    GPIO.output(self.TEMP_LED_GREEN, GPIO.LOW)
    GPIO.output(self.HUMI_LED_BLUE, GPIO.LOW)
    GPIO.output(self.HUMI_LED_GREEN, GPIO.LOW)
    GPIO.output(self.HUMI_LED_RED, GPIO.LOW)

def main():
  hub = HubDevice()

if __name__ == '__main__':
  main()