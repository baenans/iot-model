#!/bin/bash
source venv/bin/activate
# pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS=/home/pi/iot-model/raspi/service-account.json
python main.py