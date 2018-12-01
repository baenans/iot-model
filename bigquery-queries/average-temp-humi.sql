# AVERAGE TEMP HUMI PER MINUTE
SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  EXTRACT(MONTH FROM timestamp) AS month,
  EXTRACT(DAY FROM timestamp) AS day,
  EXTRACT(HOUR from timestamp) AS hour,
  EXTRACT(MINUTE from timestamp) AS minute,
  AVG(temperature) AS temperature, 
  AVG(humidity) AS humidity
FROM device_data.telemetry 
WHERE device_id = 'CNlmx974NM86zIfbPni2'
GROUP BY year, month, day, hour, minute
ORDER BY year DESC, month DESC, day DESC, hour DESC, minute DESC;


# AVERAGE, MIN AND MAX TEMP, HUMI PER HOUR
SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  EXTRACT(MONTH FROM timestamp) AS month,
  EXTRACT(DAY FROM timestamp) AS day,
  EXTRACT(HOUR from timestamp) AS hour,
  AVG(temperature) AS average_temperature, 
  MIN(temperature) AS min_temperature,
  MAX(temperature) AS max_temperature, 
  AVG(humidity) AS average_humidity,
  MIN(humidity) AS min_humidity,
  MAX(humidity) AS max_humidity
FROM device_data.telemetry 
WHERE device_id = 'CNlmx974NM86zIfbPni2'
GROUP BY year, month, day, hour
ORDER BY year DESC, month DESC, day DESC, hour DESC;


# AVERAGE, MIN AND MAX TEMP, HUMI PER DAY
SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  EXTRACT(MONTH FROM timestamp) AS month,
  EXTRACT(DAY FROM timestamp) AS day,
  AVG(temperature) AS average_temperature, 
  MIN(temperature) AS min_temperature,
  MAX(temperature) AS max_temperature, 
  AVG(humidity) AS average_humidity,
  MIN(humidity) AS min_humidity,
  MAX(humidity) AS max_humidity
FROM device_data.telemetry 
WHERE device_id = 'CNlmx974NM86zIfbPni2'
GROUP BY year, month, day
ORDER BY year DESC, month DESC, day DESC;

SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  EXTRACT(MONTH FROM timestamp) AS month,
  EXTRACT(DAY FROM timestamp) AS day,
  AVG(temperature) AS average_temperature, 
  MIN(temperature) AS min_temperature,
  MAX(temperature) AS max_temperature, 
  AVG(humidity) AS average_humidity,
  MIN(humidity) AS min_humidity,
  MAX(humidity) AS max_humidity
FROM device_data.telemetry 
WHERE device_id = 'CNlmx974NM86zIfbPni2'
AND timestamp between timestamp_sub(current_timestamp, INTERVAL 3 DAY) and current_timestamp()
GROUP BY year, month, day
ORDER BY year DESC, month DESC, day DESC;