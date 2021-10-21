import subprocess
import time
from subprocess import PIPE
from datetime import datetime
from typing import List


#TODO paralelize all functions with mutiple devices

# get list of device names
def getDevices():
    devices = []


    exe = subprocess.Popen("adb devices", shell=True, stdout=PIPE)
    output = exe.stdout.read()

    lines = output.decode().split('\n')

    for i in range(1, len(lines) - 2):
        devices.append(lines[i].split('\t')[0])

    return devices


# remove all occurrences of item in list
def removeAllOccurences(list: List, item):
    while (list.__contains__(item)):
        list.remove(item)
    return list


# execute a chain of shell commands on the device.
# no need to put "adb shell ..." in commands list
# each option/parameter must be it's own item in the commands list
def shellCmd(device: str, cmds: List[str]):
    # try to format commands properly / remove excess commands
    cmds = removeAllOccurences(cmds, "adb")
    cmds = removeAllOccurences(cmds, "shell")
    cmds = removeAllOccurences(cmds, "exit")

    cmds = ["adb", "-s", device, "shell"] + cmds

    try:
        result = subprocess.run(cmds, stdout=PIPE, stderr=PIPE, check=True, universal_newlines=True)
        return result.stdout
    except Exception as e:
        print(e)


# execute a chain of shell commands on a group of devices
def groupShellCmd(devices: List[str], cmds: List[str]):
    outputs = []

    for device in devices:
        outputs.append(shellCmd(device, cmds))

    return outputs


# execute one adb command on one device
def executeAbdCmd(device: str, cmd: str):
    # remove excess 'adb'
    if (cmd.startswith("adb")):
        cmd = cmd[3:]

    exe = subprocess.Popen("adb -s " + device + " " + cmd + " &", shell=True, stdout=subprocess.PIPE)
    output = exe.stdout.read()
    return output


# execute one adb command on multiple devices
def executeGroupCmd(devices: List[str], cmd: str):
    outputs = []

    for device in devices:
        output = executeAbdCmd(device, cmd)
        outputs.append(output)

    return outputs


# packageName: example.apk (apk file must be on the pc not the device)
def installPackage(devices: List[str], packageName: str):
    cmd = "install " + packageName
    return executeGroupCmd(devices, cmd)


# packageName: com.example.appname
def uninstallPackage(devices: List[str], packageName: str):
    cmd = "uninstall " + packageName
    return executeGroupCmd(devices, cmd)


# transfer files from pc to device
def pushFiles(devices: List[str], src: str, dest: str):
    cmd = "push " + src + " " + dest
    return executeGroupCmd(devices, cmd)


# transfer files from device to pc
def pullFiles(devices: List[str], src: str):
    cmd = "pull " + src + " "
    return executeGroupCmd(devices, cmd)


def deleteFile(devices: List[str], file: str):
    cmds = ["rm", file]
    return groupShellCmd(devices, cmds)


# record screen for n seconds and retrieve video file
# doesn't work too well for very short videos (less than 5 seconds)
def recordScreens(devices: List[str], seconds: int):
    now = datetime.now()
    dt = now.strftime("%d/%m/%Y_%H:%M:%S").replace(":", "_", 2).replace("/", "_", 2)

    for device in devices:
        filename = "recording_" + device + "_" + dt + ".mp4"

        # record screen
        cmd = ["adb -s " + device + " shell screenrecord /sdcard/" + filename + " --time-limit=" + str(seconds)]
        subprocess.Popen(cmd, shell=True, stdout=PIPE)

        # wait for screen record to finish
        time.sleep(seconds + 1)

        # pull file from device
        pullFiles([device], "/sdcard/" + filename)

        # delete file on device
        shellCmd(device, ["rm", "/sdcard/" + filename])




# take a screenshot of the device and retrieve the file
def screenCap(devices: List[str]):
    now = datetime.now()
    dt = now.strftime("%d/%m/%Y_%H:%M:%S").replace(":", "_", 2).replace("/", "_", 2)

    for device in devices:
        filename = "screencap_" + device + "_" + dt + ".png"

        # record screen
        cmd = ["adb -s " + device + " shell screencap /sdcard/" + filename]
        subprocess.Popen(cmd, shell=True, stdout=PIPE)

        # wait for screencap to be saved
        time.sleep(2)

        # pull file from device
        pullFiles([device], "/sdcard/" + filename)

        # delete file on device
        shellCmd(device, ["rm", "/sdcard/" + filename])


def inputKey(devices: List[str], key: int):
    return groupShellCmd(devices, ["input", "keyevent", str(key)])



def shutdown(devices: List[str]):
    return groupShellCmd(devices, ["reboot", "-p"])




outputs = ""

devices = getDevices()

# outputs = installPackage(devices, "vlc.apk")
# outputs = uninstallPackage(devices, "org.videolan.vlc")

# outputs = pushFiles(devices, "./randomFile", "/sdcard/")
# outputs = pullFiles(devices, "./sdcard/randomFile")
# outputs = deleteFile(devices, "./sdcard/randomFile")

# outputs = groupShellCmd(devices, ["ls", "-la"])

# recordScreens(devices, 10)
# screenCap(devices)

inputKey(devices, 3) #home
# inputKey(devices, 4) #back
# inputKey(devices, 27) #open camera

# shutdown(devices)


print(outputs)
