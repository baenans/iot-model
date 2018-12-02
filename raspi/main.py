import json, time
import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
from google.cloud import pubsub_v1
# protobuffs
import sensorevent_pb2
import rgbledstatus_pb2

class HubDevice:
  def __init__(self):
    self.CLOUD_PUBSUB_PUBLISHER = pubsub_v1.PublisherClient()
    self.CLOUD_PUBSUB_PUBLISH_TOPIC_NAME = self.CLOUD_PUBSUB_PUBLISHER.topic_path('temp-humidity-monitoring', 'device-ingest')

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
    self.subscribe_to_rgb_actuator()
    self.MQTT_CLIENT.loop_forever()

  # Callback of MQTT connect, subscribes to ESP8266 Temp Sensor
  def on_connect(self, client, userdata, flags, rc):
    self.MQTT_CLIENT.subscribe("events", 2)

  # Handles MQTT messages from ESP8266 Temp Sensor
  def on_message(self, client, userdata, msg):
    event = sensorevent_pb2.SensorEvent()
    event.ParseFromString(msg.payload)
    self._updateDashboard(event.temperature, event.humidity)
    self.send_to_the_clouds({
      'timestamp': event.timestamp,
      'temperature': event.temperature,
      'humidity': event.humidity,
      'device_id': 'CNlmx974NM86zIfbPni2' # TODO: (fbaena@) dynamic devices id
    })

  # Uploads information to Google Cloud 
  def send_to_the_clouds(self, data):
    min_refresh = self.last_cloud_refresh + self.CLOUD_REFRESH_INTERVAL
    if data['timestamp'] >= min_refresh:
      json_data = json.dumps(data)
      self.CLOUD_PUBSUB_PUBLISHER.publish(self.CLOUD_PUBSUB_PUBLISH_TOPIC_NAME, json_data)
      self.last_cloud_refresh = data['timestamp']
      print json_data
    else:
      print "Not refreshing cloud on %d" % data['timestamp']
  
  # Updates status of temperature leds
  def _updateTempLeds(self, green, yellow, red):
    GPIO.output(self.TEMP_LED_GREEN, GPIO.HIGH if green else GPIO.LOW)
    GPIO.output(self.TEMP_LED_YELLOW, GPIO.HIGH if yellow else GPIO.LOW)
    GPIO.output(self.TEMP_LED_RED, GPIO.HIGH if red else GPIO.LOW)

  # Updates the humidity LEDs
  def _updateHumiLeds(self, blue, green, red):
    GPIO.output(self.HUMI_LED_BLUE, GPIO.HIGH if blue else GPIO.LOW)
    GPIO.output(self.HUMI_LED_GREEN, GPIO.HIGH if green else GPIO.LOW)
    GPIO.output(self.HUMI_LED_RED, GPIO.HIGH if red else GPIO.LOW)

  # Updates the status in the raspberry dashboard
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

  # Configures Raspberry GPIO ports for dashboard
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

  # Updates status on the ESP8266 RGB Actuator
  def updateRGBActuatorStatus(self, red=0, green=0, blue=0):
    rgb_led_status = rgbledstatus_pb2.RGBLedStatus()
    rgb_led_status.red = red
    rgb_led_status.green = green
    rgb_led_status.blue = blue
    self.MQTT_CLIENT.publish('rgbstatus', rgb_led_status.SerializeToString())

  def subscribe_to_rgb_actuator(self):
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(
      'temp-humidity-monitoring', 'rgb-status-dev-hub')

    def callback(message):
      cloud_led_status = json.loads(message.data)
      print('UPDATING status of RGB Actuator: {}'.format(cloud_led_status))
      self.updateRGBActuatorStatus(
        cloud_led_status.red,
        cloud_led_status.green,
        cloud_led_status.blue
      )
      message.ack()
    subscriber.subscribe(subscription_path, callback=callback)

def main():
  hub = HubDevice()

if __name__ == '__main__':
  main()