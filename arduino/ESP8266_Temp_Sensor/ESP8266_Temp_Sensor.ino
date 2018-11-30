#define ESP8266
#define DHT_PIN 13
#define EVENT_INTERVAL 10 * 1000
#include "config.h"
#include "sensorevent.pb.h"
#include <pb_common.h>
#include <pb.h>
#include <pb_encode.h>
#include <pb_decode.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <DHTesp.h>

DHTesp dht;
WiFiClient wClient;
PubSubClient client(wClient);

void setup() {
  Serial.begin(9600);
  dht.setup(DHT_PIN, DHTesp::DHT11); 
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  Serial.println("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
  }
  Serial.println("WiFi connected!");

  client.setServer(MQTT_SERVER, 1883);
  
  configTime(0, 0, "pool.ntp.org"); 
  Serial.println("\nTime Sync");
  while (!time(nullptr)) {
    Serial.print(".");
    delay(1000);
  }
}

void _reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP8266Client")) {
      Serial.println("Connected to MQTT!");
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println("Retry in 5 seconds");
      delay(5000);
    }
  }
}

long lastMsg = 0;

void mqttPublish(pb_SensorEvent event) {
  uint8_t buffer[128];
  pb_ostream_t stream = pb_ostream_from_buffer(buffer, sizeof(buffer));
  
  if (!pb_encode(&stream, pb_SensorEvent_fields, &event)){
    Serial.println("Failure encoding Sensor Event proto");
    return;
  }
  client.publish("events", buffer, stream.bytes_written);
}

void loop() {
  if (!client.connected())
    _reconnect();

  client.loop();
  
  long now = millis();
  time_t timestamp = time(nullptr);
  
  if (now - lastMsg > 2000) {
    lastMsg = now;

    TempAndHumidity sensorValues = dht.getTempAndHumidity();
    pb_SensorEvent event = pb_SensorEvent_init_zero;
    event.deviceId = 1;
    event.timestamp = timestamp;
    event.temperature = sensorValues.temperature;
    event.humidity = sensorValues.humidity;
    
    mqttPublish(event);
  }
}
