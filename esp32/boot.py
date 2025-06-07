
import network

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("clear", "31415161")

while not wlan.isconnected():
    pass

print("Connected to Wi-Fi:", wlan.ifconfig())

  