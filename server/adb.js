import child_process from 'child_process';
import fs from 'fs';

//package name of app that manages wifi connections 
const wifiManagerPackage = "com.steinwurf.adbjoinwifi"

/*
	Replace all occurences of searchval with newval in source
*/
function replaceAll(source, searchval, newval) {
    while (source.includes(searchval)) {
        source = source.replace(searchval, newval)
    }
    return source
}


/*
	Replace <space> with \<space> in source and returns it
	necessary for adb commands (wifi, filenames, etc)
*/
function echapSpaces(source) {

    var newVal = "";

    for (let i in source) {
        if (source[i] != " ") {
            newVal += source[i];
        } else {
            newVal += "\\\ ";
        }
    }

    return newVal;
}


/*
	Remove all occurences of searchval in source
*/
function removeAll(source, searchval) {
    while (source.includes(searchval)) {
        var index = source.indexOf(searchval);
        if (index !== -1) {
            source = source.splice(index, 1);
        }
    }
    return source
}


/*
	Sleep for x milliseconds (to actually create a delay, function must be used as: 'await sleep(x);' in an async function)
*/
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


/*
	Blocks execution for x milliseconds (syncronously)
*/
function syncDelay(milliseconds) {
    var start = new Date().getTime();
    var end = 0;
    while ((end - start) < milliseconds) {
        end = new Date().getTime();
    }
}


/*
	Get list of devices connected via adb
*/
function getDevices() {


    const adbProccess = child_process.spawnSync('adb', ["devices"]);

    let output = adbProccess.stdout.toString();

    //remove the first few lines of the command output
    output = output.split("\n");
    output.splice(0, 1);

    let devices = [];

    //retreive just the device ids
    for (var i in output) {
        if (output[i] != "") {
            devices.push(output[i].split("\t")[0])
        }
    }

    return devices;
}


/*
	Execute a chain of shell commands on a device.
	No need to put "adb shell ..." in commands list
	Each option/parameter must be it's own item in the commands list
	Advise against doing cmds : String, cmds.split(" ") because some command options can contain spaces
	Any command options that do contain a space must escaped (replace <space> with \<space> via the echapSpaces() function)
*/
function shellCmd(device, cmds) {

    //try to format commands properly / remove excess commands
    cmds = removeAll(cmds, "adb");
    cmds = removeAll(cmds, "shell");
    cmds = removeAll(cmds, "exit");

    cmds = ["-s", device, "shell"].concat(cmds)

    const adbProccess = child_process.spawnSync('adb', cmds);

    return adbProccess.stdout.toString();
}


/*
	Execute a chain of shell commands on a group of devices
	No need to put "adb shell ..." in commands list
	Each option/parameter must be it's own item in a list of commands 
*/
function groupShellCmd(devices, cmds) {

    var output = {};

    for (var i in devices) {
        let temp = shellCmd(devices[i], cmds);
        output[devices[i]] = temp;
    }

    return output;
}


/*
	Execute one adb command on one device
	No need to put "adb" in command
*/
function adbCmd(device, cmd) {

    //remove excess
    if (cmd.startsWith("adb")) {
        cmd = cmd.substring(4);
    }

    //target one specific device
    let args = ["-s", device].concat(cmd.split(" "))

    const adbProcess = child_process.spawnSync('adb', args);

    return adbProcess.stdout.toString();
}


/*
	Execute one adb command on a group of devices
	No need to put "adb" in command
*/
function groupAdbCmd(devices, cmd) {

    var output = {};

    for (var i in devices) {
        let temp = adbCmd(devices[i], cmd)
        output[devices[i]] = temp;
    }

    return output;
}


/*
	Installs an app from an .apk file
	packageName: example.apk (apk file must be on the pc not the device)
	/!\ Installation does not work and FREEZES the server if apk is not the right version for device /!\
	//find a work-around
*/
function installPackage(devices, packageName) {

    packageName = echapSpaces(packageName);

    console.log("Installing " + packageName + " on the following devices: " + devices);
    let cmd = "install " + packageName
    return groupAdbCmd(devices, cmd)
}


/*
	Uninstalls a package
	packageName: com.example.appname
*/
function uninstallPackage(devices, packageName) {

    packageName = echapSpaces(packageName);

    let cmd = "uninstall " + packageName
    return groupAdbCmd(devices, cmd)
}


/*
    Uninstall multiple packages from a list of devices
*/
function uninstallMuliplePackages(devices, packages) {

    output = {}

    for (var i in packages) {
        output[packages[i]] = uninstallPackage(devices, packages[i]);
    }
    return output;
}


/*
	Transfer files from pc to device
	dest should start with ./sdcard/...
	We can't use the generic adbCmd() function here because the filename may conatain spaces that can't be \escaped
*/
function pushFiles(devices, src, dest) {

    var output = {};

    for (var i in devices) {
        let args = ["-s", devices[i], "push", src, dest];
        const adbProccess = child_process.spawnSync('adb', args);
        output[devices[i]] = adbProccess.stdout.toString();
    }

    return output;
}


/*
	Transfer files from device to pc
	src should start with ./sdcard/...
	the file that is pulled is renamed on the server to keep names unique
	We can't use the generic adbCmd() function here because the filename may conatain spaces that can't be \escaped

	returns true if pull was successful
	otherwise returns false
*/
function pullFiles(device, src) {

    let splitSrc = src.split("/");
    let fileName = splitSrc[splitSrc.length - 1];

    let args = ["-s", device, "pull", src, "."];
    const adbProccess = child_process.spawnSync('adb', args);
    let cmdOutput = adbProccess.stdout.toString();

    if (cmdOutput.startsWith("adb: error")) {
        return false;
    } else {
        try {
            fs.renameSync("./" + fileName, "./" + device + "_" + fileName);
            return true;
        } catch (e) {
            return false;
        }
    }

    return false;
}


/*
	Deletes files on the device
	filepath should start with ./sdcard/...
	function works but feedback (output) is useless
*/
function deleteFile(devices, filepath) {

    var origPath = filepath;

    filepath = echapSpaces(filepath);

    var output = {};

    for (var i in devices) {
        var existsBefore = false; //file was present before deletion
        var existsAfter = false; //file is still present after attempted deletion

        var lsOutput = shellCmd(devices[i], ["ls", filepath]).trim(); //check if file exists
        existsBefore = (lsOutput == origPath);

        shellCmd(devices[i], ["rm", filepath])

        lsOutput = shellCmd(devices[i], ["ls", filepath]).trim(); //check if file has been deleted
        existsAfter = (lsOutput == origPath);


        if (!existsBefore) { //the file never existed
            output[devices[i]] = origPath + " No such file or directory";
        } else {
            if (!existsAfter) { //file did exist and was deleted
                output[devices[i]] = origPath + " was deleted successfully";
            } else { //file still exists and was not deleted
                output[devices[i]] = "Error " + origPath + " was not deleted";
            }
        }
    }

    return output;
}


/*
	Take a screenshot of the device and pull the file
*/
function screenCap(device) {

    let timestamp = Date.now();

    let filename = "screencap_" + timestamp.toString() + ".png"; //define name of file as screepcap_timestamp.png
    shellCmd(device, ["screencap", "/sdcard/" + filename]); //perform screenshot
    syncDelay(3 * 1000); //wait for image to be saved
    pullFiles([device], "/sdcard/" + filename) //pull image file
    deleteFile([device], "/sdcard/" + filename); //delete image file on device


    return device + "_" + filename;
}


/*
	Record screen for n seconds and retrieve video file
	Doesn't seem to work too well for very short videos (less than 5 seconds)

    returns the name of the video file that was pulled from device
*/
function recordScreen(device, seconds) {

    let timestamp = Date.now();

    let filename = "recording_" + timestamp.toString() + ".mp4"; //define name of file as recording_timestamp.mp4
    shellCmd(device, ["screenrecord", "/sdcard/" + filename, "--time-limit=" + seconds.toString()]); //perform recording
    syncDelay((seconds + 1) * 1000); //wait for recording to be finished
    pullFiles([device], "/sdcard/" + filename); //pull video file
    deleteFile([device], "/sdcard/" + filename); //delete video file on device

    return device + "_" + filename; //new filename
}


/*
	Input a keyEvent; key is an int
	The list of all keyEvent numbers can be found here: 
	https://developer.android.com/reference/android/view/KeyEvent#constants
*/
function inputKey(devices, key) {
    return groupShellCmd(devices, ["input", "keyevent", key.toString()])
}


/*
	Turn off the devices
	Warning: there is no way to turn on devices via adb
*/
function shutdown(devices) {
    return groupShellCmd(devices, ["reboot", "-p"])
}


/*
	Get the list of all packages installed of each device
*/
function getPackages(devices) {

    var output = {};

    for (var i in devices) {
        var temp = shellCmd(devices[i], ["cmd", "package", "list", "packages"])
        var packagelist = temp;

        packagelist = packagelist.split("\n") //clean up output
        for (var j in packagelist) {
            packagelist[j] = packagelist[j].substring(8);
        }
        output[devices[i]] = packagelist;
    }
    return output;
}


/*
	Returns a list of devices with their battery level
*/
function getBatteryLevel(devices) {

    var output = {};

    for (var i in devices) {

        var temp = shellCmd(devices[i], ["dumpsys", "battery"]);
        temp = temp.split("\n");

        var level;

        for (var j in temp) {
            temp[j] = temp[j].trim();
            if (temp[j].startsWith("level")) {
                level = parseInt(temp[j].substring(7));
                break;
            }
        }

        output[devices[i]] = level;
    }

    return output;
}


/*
	Returns true if package is installed on the device
	packageName: com.example.appname
*/
function checkPackageInstalled(device, packageName) {
    var output = shellCmd(device, ["pm", "list", "packages", packageName]);
    return output.includes(packageName);
}


/*
	Checks if the WifiSettingsManager is installed and if not, installes it (syncronous)
*/
function checkWifiManagerInstalled(device) {
    if (!checkPackageInstalled(device, wifiManagerPackage)) {
        installPackage([device], "wifiManager.apk");
    }
}


/*
	Checks if the wifi manager app is installed and installs it if not.
	Adds wifi network with just a password, or no password.
	There exists support to set static proxy.
	Wifi manager app: https://github.com/steinwurf/adb-join-wifi (BSD license)
	passwordType: 'WPA'/'WEP'/'none'
*/
function addWifiNetwork(devices, ssid, passwordType, password) {

    var ssid = echapSpaces(ssid); //replace <space> with \<space>
    var password = echapSpaces(password); //replace <space> with \<space>

    var output = {};

    for (var i in devices) {
        checkWifiManagerInstalled(devices[i]); //make sure wifi manager is installed
        try {
            if (passwordType != "none") {
                output[devices[i]] = shellCmd(devices[i], ["am", "start", "-n", "com.steinwurf.adbjoinwifi/.MainActivity", "-e", "ssid", ssid, "-e", "password_type", passwordType, "-e", "password", password]);
            } else {
                output[devices[i]] = shellCmd(devices[i], ["am", "start", "-n", "com.steinwurf.adbjoinwifi/.MainActivity", "-e", "ssid", ssid]);
            }
        } catch (e) {
            output[devices[i]] = e;
        }


    }

    return output;
}


/*
	Turns wifi on or off
	toggle is boolean
*/
function toggleWifi(devices, toggle) {

    var output = {};


    for (var i in devices) {
        if (toggle) {
            output[devices[i]] = shellCmd(devices[i], ["svc", "wifi", "enable"]);
        } else {
            output[devices[i]] = shellCmd(devices[i], ["svc", "wifi", "disable"]);
        }
    }

    return checkWifiEnabled(devices);
}


/*
    returns whether or not the wifi is enabled
*/
function checkWifiEnabled(devices) {

    var output = {};

    for (var i in devices) {
        var temp = shellCmd(devices[i], ["dumpsys", "wifi"]);
        temp = temp.split("\n");
        temp = temp[0];

        output[devices[i]] = (temp == "Wi-Fi is enabled");
    }

    return output;
}


/*
	Removes a wifi network
	Doesn't seem to work
*/
function forgetWifi(devices) {

    var output = {};

    for (var i in devices) {
        output[devices[i]] = shellCmd(devices[i], ["am", "startservice", "-n", "com.google.wifisetup/.WifiSetupService", "-a", "WiFiSetupService.Reset"]);
    }

    return output;

}


/*
	Perform dump then isolate wifi connection name and return it
	if not connected to any wifi then return "none"
*/
function checkWifiNetwork(devices) {

    var output = {};

    for (var i in devices) {
        let temp = shellCmd(devices[i], ["dumpsys", "connectivity"]).split("\n");
        let wifiConnections = [];

        for (var line in temp) {
            temp[line] = temp[line].trim();

            if (temp[line].startsWith("NetworkAgentInfo")) {
                temp[line] = temp[line].split(", ");

                for (var element in temp[line]) {
                    if (temp[line][element].startsWith("extra")) {
                        temp[line][element] = temp[line][element].slice(8);
                        wifiConnections.push(temp[line][element].substring(0, temp[line][element].length - 1));
                        break;
                    }
                }
            }
        }

        //add any connection that is not "none" to output (unless there isn't one, in which case add "none")
        output[devices[i]] = "none";
        for (var connection in wifiConnections) {
            if (wifiConnections[connection] != "none") {
                output[devices[i]] = wifiConnections[connection];
                break;
            }
        }
    }

    return output;

}





export {
    getDevices,
    shellCmd,
    groupShellCmd,
    adbCmd,
    groupAdbCmd,
    installPackage,
    checkPackageInstalled,
    uninstallPackage,
    uninstallMuliplePackages,
    pushFiles,
    pullFiles,
    deleteFile,
    screenCap,
    recordScreen,
    inputKey,
    getPackages,
    getBatteryLevel,
    addWifiNetwork,
    toggleWifi,
    checkWifiEnabled,
    forgetWifi,
    checkWifiNetwork,
}