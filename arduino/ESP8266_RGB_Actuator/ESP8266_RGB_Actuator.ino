#define ESP8266
#include "config.h"
#include "rgbledstatus.pb.h"
#include <pb_common.h>
#include <pb.h>
#include <pb_decode.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>

int RED = D5;
int GREEN = D6;
int BLUE = D7;

WiFiClient wClient;
PubSubClient client(wClient);

void setup() {
  Serial.begin(9600);

  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(BLUE, OUTPUT);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  Serial.println("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
  }
  Serial.println("WiFi connected!");

  client.setServer(MQTT_SERVER, 1883);
  client.setCallback(callback);
}

void _reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP8266_RGB_Actuator")) {
      Serial.println("Connected to MQTT!");
      client.subscribe("rgbstatus");  // resuscribe to topic
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println("Retry in 5 seconds");
      delay(5000);
    }
  }
}

void updateLedColor(int red, int green, int blue) {
  analogWrite(RED, red);
  analogWrite(GREEN, green);
  analogWrite(BLUE, blue);
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");

  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  pb_RGBLedStatus message = pb_RGBLedStatus_init_zero;
  pb_istream_t stream = pb_istream_from_buffer(payload, length);
  bool status;
    
  status = pb_decode(&stream, pb_RGBLedStatus_fields, &message);
    
  if (!status) {
    Serial.print("Decoding failed");
    Serial.println();
  } else {
    updateLedColor(
      (int)message.red,
      (int)message.green,
      (int)message.blue
     );
  }
  
}


void loop() {
  if (!client.connected())
    _reconnect();

  client.loop();
  
}
