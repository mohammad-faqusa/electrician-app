from oled import OLED

# Initialise pins dictionary
peripherals_pins = {
    "oled display": {},
}

# Initialise peripherals dictionary
peripherals = {}

# Instantiate each peripheral
peripherals["oled display"] = OLED()


import json

from mqtt_as import MQTTClient, config
import uasyncio as asyncio
import comparator

cmp = comparator.Comparator()
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
        automation = msg.copy()
        if(msg.get('interrupt')): #if peripheral is motion sensor or push button
            peripherals[automation["source"]].set_callback(make_mqtt_cb(automation))
            return
                
        automations.append(automation)
        return

    if(msg.get('pins')):
        result['pins'] = peripherals_pins
        result['status'] = True
        result['commandId'] = msg['commandId']
        await client.publish('esp32/3/sender', '{}'.format(json.dumps(result)), qos = 1)
        print("this is pins")
        return  # ✅ Terminate early
     
    value = peripherals[msg['peripheral']][msg['method']][msg['param']]
    
    result['peripheral'] = msg['peripheral']
    result['method'] = msg['method']
    
    result['value'] = value
    result['status'] = True
    result['commandId'] = msg['commandId']

    await client.publish('esp32/3/sender', '{}'.format(json.dumps(result)), qos = 1)


async def conn_han(client):
    await client.subscribe('esp32/3/receiver', 1)
    
async def main(client):
    await client.connect()

    # Start the automation loop in background
    asyncio.create_task(automation_loop())

    n = 0
    esp_status = {}
    esp_status['id'] = 3

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
                

async def publishMqttAutomation(outputDeviceId, outputMsg):
    await client.publish('esp32/{}/receiver'.format(outputDeviceId), json.dumps(outputMsg), qos = 1)
async def runAutomation(automation):
    outputMsg = {}
    outputMsg['peripheral'] = automation['source-output']
    outputMsg['method'] = automation['method-output']
    outputMsg['param'] = automation['outputParams']
    outputMsg['commandId'] = 1
    
    outputDeviceId = automation['outputDeviceId']
    
    selectedPeripheral = automation['source']
    selectedMethod = automation['method']
    inputParams = automation['inputParams']

    if(automation['returnType'] == 'Number'):
        
        threshold = automation['threshold'] 
        if(cmp[automation['condition']][peripherals[selectedPeripheral][selectedMethod][inputParams], threshold]):
            await publishMqttAutomation(outputDeviceId, outputMsg)
    elif (automation['returnType'] == 'Boolean'):
        if(cmp['eq'][peripherals[selectedPeripheral][selectedMethod][inputParams], automation['condition']]):
            await publishMqttAutomation(outputDeviceId, outputMsg)
        
    print(outputMsg)

def make_mqtt_cb(automation):
    outputMsg = {}
    outputMsg['peripheral'] = automation['source-output']
    outputMsg['method'] = automation['method-output']
    outputMsg['param'] = automation['outputParams']
    outputMsg['commandId'] = 1
    output_device_id = automation['outputDeviceId']
    
    if outputMsg['param'] is None:
        outputMsg['param'] = []
    
    async def _job(level):
        if(automation['source'] == 'encoder'):
            print('message is sent with angle : ', level)
            outputMsg['param'] = [level] 
            await publishMqttAutomation(output_device_id, outputMsg)
        elif(level == automation['condition']):
            await publishMqttAutomation(output_device_id, outputMsg)
            

    # synchronous wrapper — **what you actually register**
    return lambda level: asyncio.create_task(_job(level))


config['subs_cb'] = callback
config['connect_coro'] = conn_han

MQTTClient.DEBUG = True  # Optional: print diagnostic messages
client = MQTTClient(config)
try:
    asyncio.run(main(client))
finally:
    client.close()  # Prevent LmacRxBlk:1 errors
