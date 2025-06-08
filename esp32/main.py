from accelerometer import MPU6050
from relay import Relay
from dht_sensor import DHTSensor

# Initialise pins dictionary
peripherals_pins = {
    "acc": {},
    "r1": {},
    "r2": {},
    "dht": {},
}

# Initialise peripherals dictionary
peripherals = {}

# Instantiate each peripheral
peripherals["acc"] = MPU6050()
peripherals["r1"] = Relay(pin=25)
peripherals["r2"] = Relay(pin=26)
peripherals["dht"] = DHTSensor(pin=17)


import json

from mqtt_as import MQTTClient, config
import asyncio

automations = []

# Local configuration
config['ssid'] = 'clear'  # Optional on ESP8266
config['wifi_pw'] = '13141516'
config['server'] = '192.168.137.1'  # Change to suit e.g. 'iot.eclipse.org'

def callback(topic, msg, retained, properties=None):
    asyncio.create_task(async_callback(topic, msg, retained))

async def async_callback(topic, msg, retained):
    print((topic.decode(), msg.decode(), retained))
    msg = msg.decode()
    msg = json.loads(msg)
    result = {}

    if(msg.get('automation')):
        automation = {}
        automation = msg.copy();
        automations.append(automation)
        return

    if(msg.get('pins')):
        result['pins'] = peripherals_pins
        result['status'] = True
        result['commandId'] = msg['commandId']
        await client.publish('esp32/9/sender', '{}'.format(json.dumps(result)), qos = 1)
        print("this is pins")
        return  # ✅ Terminate early
     
    print("don't run here : "); 
    value = peripherals[msg['peripheral']][msg['method']][msg['param']]
    
    result['peripheral'] = msg['peripheral']
    result['method'] = msg['method']
    
    result['value'] = value
    result['status'] = True
    result['commandId'] = msg['commandId']

    await client.publish('esp32/9/sender', '{}'.format(json.dumps(result)), qos = 1)

async def conn_han(client):
    await client.subscribe('esp32/9/receiver', 1)
    
async def main(client):
    await client.connect()

    # Start the automation loop in background
    asyncio.create_task(automation_loop())

    n = 0
    esp_status = {}
    esp_status['id'] = 9

    while True:
        await asyncio.sleep(1)
        
        esp_status['times'] = n

        print('publish', n)
        # If WiFi is down the following will pause for the duration.
        await asyncio.sleep(1)
        await client.publish('esp32/online', json.dumps(esp_status), qos = 1)
        n += 1

async def automation_loop():
    while True:
        await asyncio.sleep(1)  # Check every 1 second
        for automation in automations:
            try:
                await runAutomation(automation)
            except Exception as e:
                print("Automation error:", e)
                

async def runAutomation(automation):
    outputMsg = {}
    outputMsg['peripheral'] = automation['source-output']
    outputMsg['method'] = automation['method-output']
    outputMsg['param'] = automation['outputParams']
    outputMsg['commandId'] = 1
    
    outputDeviceId = automation['outputDeviceId']

    if(automation['threshold']):
        selectedPeripheral = automation['source']
        selectedMethod = automation['method']
        inputParams = automation['inputParams']
        threshold = automation['threshold'] 
        if(automation['condition'] == 'gt'):
            if(peripherals[selectedPeripheral][selectedMethod][inputParams] > threshold):
                await client.publish('esp32/{}/receiver'.format(outputDeviceId), json.dumps(outputMsg), qos = 1)
        if(automation['condition'] == 'lt'):
            if(peripherals[selectedPeripheral][selectedMethod][inputParams] < threshold):
                await client.publish('esp32/{}/receiver'.format(outputDeviceId), json.dumps(outputMsg), qos = 1)
        if(automation['condition'] == 'eq'):
            if(peripherals[selectedPeripheral][selectedMethod][inputParams] == threshold):
                await client.publish('esp32/{}/receiver'.format(outputDeviceId), json.dumps(outputMsg), qos = 1)
    print(outputMsg)

config['subs_cb'] = callback
config['connect_coro'] = conn_han

MQTTClient.DEBUG = True  # Optional: print diagnostic messages
client = MQTTClient(config)
try:
    asyncio.run(main(client))
finally:
    client.close()  # Prevent LmacRxBlk:1 errors
