import json, time
import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
import sensorevent_pb2
from google.cloud import pubsub_v1

PUBLISHER = pubsub_v1.PublisherClient()
TOPIC_NAME = PUBLISHER.topic_path('temp-humidity-monitoring', 'device-ingest')

BUZZER = 26
TEMP_LED_RED = 5
TEMP_LED_YELLOW = 6
TEMP_LED_GREEN = 13

def on_connect(client, userdata, flags, rc):
  client.subscribe("events", 2)

def send_to_the_clouds(data):
  json_data = json.dumps(data)
  # PUBLISHER.publish(TOPIC_NAME, json_data)
  print json_data

def _updateTempLeds(green, yellow, red):
  GPIO.output(TEMP_LED_GREEN, GPIO.LOW if green else GPIO.LOW)
  GPIO.output(TEMP_LED_YELLOW, GPIO.HIGH if yellow else GPIO.LOW)
  GPIO.output(TEMP_LED_RED, GPIO.HIGH if red else GPIO.LOW)

def updateTemperature(temp):
  if  temp < 20:
    _updateTempLeds(True, False, False)
  elif temp >= 20 and temp < 30:
    _updateTempLeds(False, True, False)
  else:
    _updateTempLeds(False, False, True)

def on_message(client, userdata, msg):
  event = sensorevent_pb2.SensorEvent()
  event.ParseFromString(msg.payload)
  updateTemperature(event.temperature)
  send_to_the_clouds({
    'timestamp': event.timestamp,
    'temperature': event.temperature,
    'humidity': event.humidity,
    'device_id': event.deviceId
  })

def main():
  client = mqtt.Client("hub-device")
  client.on_connect = on_connect
  client.on_message = on_message
  client.connect("localhost", 1883)

  GPIO.setmode(GPIO.BCM)
  GPIO.setup(TEMP_LED_RED, GPIO.OUT)
  GPIO.setup(TEMP_LED_YELLOW, GPIO.OUT)
  GPIO.setup(TEMP_LED_GREEN, GPIO.OUT)
  GPIO.output(TEMP_LED_RED, GPIO.LOW)
  GPIO.output(TEMP_LED_YELLOW, GPIO.LOW)
  GPIO.output(TEMP_LED_GREEN, GPIO.LOW)

  client.loop_forever()

if __name__ == '__main__':
  main()