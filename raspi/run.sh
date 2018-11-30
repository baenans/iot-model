#!/bin/bash
source venv/bin/activate
export GOOGLE_APPLICATION_CREDENTIALS=/home/pi/iot-model/raspi/service-account.json
python main.py