#!/bin/sh

sudo apt update
sudo apt install curl

curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install adb -y

adb devices

npm run init

