import json, time
import paho.mqtt.client as mqtt
import sensorevent_pb2
from google.cloud import pubsub_v1

PUBLISHER = pubsub_v1.PublisherClient()
TOPIC_NAME = PUBLISHER.topic_path('temp-humidity-monitoring', 'device-ingest')

def on_connect(client, userdata, flags, rc):
    client.subscribe("events", 2)

def send_to_the_clouds(data):
    json_data = json.dumps(data)
    PUBLISHER.publish(TOPIC_NAME, json_data)
    print json_data

def on_message(client, userdata, msg):
    event = sensorevent_pb2.SensorEvent()
    event.ParseFromString(msg.payload)
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

    client.loop_forever()

main()