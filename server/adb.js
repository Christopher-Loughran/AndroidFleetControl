import child_process from 'child_process';
import fs from 'fs';

//package name of app that manages wifi connections 
const wifiManagerPackage = "com.steinwurf.adbjoinwifi"

/*
	Replace all occurences of searchval with newval in source
*/
function replaceAll(source, searchval, newval){
	while(source.includes(searchval)){
		source = source.replace(searchval, newval)
	}
	return source
}


/*
	Replace <space> with \<space> in source and returns it 
*/
function echapSpaces(source){

	var newVal = "";

	for(let i in source){
		if(source[i] != " "){
			newVal += source[i];
		}
		else{
			newVal += "\\\ ";
		}
	}

	return newVal;
}


/*
	Remove all occurences of searchval in source
*/
function removeAll(source, searchval){
	while(source.includes(searchval)){
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
function syncDelay(milliseconds){
	var start = new Date().getTime();
	var end=0;
	while( (end-start) < milliseconds){
		end = new Date().getTime();
	}
}


/*
	Get list of connected devices
*/
function getDevices(){


	const adbProccess = child_process.spawnSync('adb', ["devices"]);

	let output = adbProccess.stdout.toString();

	//remove the first few lines of the command output
	output = output.split("\n");
	output.splice(0, 1); 

	let devices = [];

	//retreive just the device ids
	for(var i in output){
		if(output[i] != ""){
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
function shellCmd(device, cmds){

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
function groupShellCmd(devices, cmds){

	var output = [];

	for(var i in devices){
		let temp = shellCmd(devices[i], cmds);
		output[devices[i]] = temp;
	}

	return output;
}


/*
	Execute one adb command on one device
	No need to put "adb" in command
*/
function adbCmd(device, cmd){

	//remove excess
	if(cmd.startsWith("adb")){
		cmd = cmd.substring(4);
	}

	//target one specific device
	let args = ["-s", device].concat(cmd.split(" "))

	const adbProccess = child_process.spawnSync('adb', args);

	return adbProccess.stdout.toString();
}


/*
	Execute one adb command on a group of devices
	No need to put "adb" in command
*/
function groupAdbCmd(devices, cmd){

	var output = [];

	for(var i in devices){
		let temp = adbCmd(devices[i], cmd)
		output[devices[i]] = temp;
	}

	return output;
}


/*
	Installs an app from an .apk file
	packageName: example.apk (apk file must be on the pc not the device)
	/!\ Installation does not work and in fact FREEZES the server if apk is not the right version for device /!\
*/
function installPackage(devices, packageName){

	packageName = echapSpaces(packageName);

	console.log("Installing " + packageName + " on the following devices: " + devices);
	let cmd = "install " + packageName
    return groupAdbCmd(devices, cmd)
}


/*
	Uninstalls a package
	packageName: com.example.appname
*/
function uninstallPackage(devices, packageName){

	packageName = echapSpaces(packageName);

	let cmd = "uninstall " + packageName
    return groupAdbCmd(devices, cmd)
}
    

/*
	Transfer files from pc to device
	dest should start with ./sdcard/...
	We can't use the generic adbCmd() function here because the filename may conatain spaces that can't be \escaped
*/
function pushFiles(devices, src, dest){


	var output = []

	for(var i in devices){
		let args = ["-s", devices[i], "push", src, dest];
		const adbProccess = child_process.spawnSync('adb', args);
		output[devices[i]] = adbProccess.stdout.toString();
	}

    return output;
}


/*
	Transfer files from device to pc
	src should start with ./sdcard/...
*/
function pullFiles(devices, src){

	let splitSrc = src.split("/");
	let fileName = splitSrc[splitSrc.length-1];

	var output = [];

	for(var i in devices){//for each device: pull the file then rename it to devicename_filename.ext
		let cmd = "pull " + echapSpaces(src) + " ."
		console.log(cmd);
		var cmdOutput = adbCmd(devices[i], cmd);
		fs.renameSync("./"+fileName, "./"+devices[i]+"_"+fileName);

		let temp = cmdOutput.split("\n"); //clean up output
		temp = temp[temp.length-2];
		output[devices[i]] = temp;
	}

	return output

}


/*
	Deletes files on the device
	filepath should start with ./sdcard/...
	function works but feedback(output) is useless
*/
function deleteFile(devices, filepath){

	filepath = echapSpaces(filepath);

    let cmds = ["rm", filepath]
    return groupShellCmd(devices, cmds)
}


/*
	Take a screenshot of the device and retrieve the file
*/
function screenCap(device){

	let timestamp = Date.now();

	var output = [];

	let filename = "screencap_" + timestamp.toString() + ".png"; //define name of file as screepcap_timestamp.png
	shellCmd(device, ["screencap", "/sdcard/" + filename]); //perform screenshot
	syncDelay(3*1000); //wait for image to be saved
	pullFiles([device], "/sdcard/" + filename) //pull image file
	deleteFile([device], "/sdcard/" + filename); //delete image file on device
	

	return device + "_" + filename;
}


/*
	Record screen for n seconds and retrieve video file
	Doesn't seem to work too well for very short videos (less than 5 seconds)
*/
function recordScreen(device, seconds){

	let timestamp = Date.now();

	let filename = "recording_" + timestamp.toString() + ".mp4"; //define name of file as recording_timestamp.mp4
	shellCmd(device, ["screenrecord", "/sdcard/" + filename, "--time-limit=" + seconds.toString()]); //perform recording
	syncDelay((seconds+1)*1000); //wait for recording to be finished
	pullFiles([device], "/sdcard/" + filename); //pull video file
	deleteFile([device], "/sdcard/" + filename); //delete video file on device
	
	return device + "_" + filename; //new filename
}


/*
	Input a keyEvent; key is an int
	The list of all keyEvent numbers can be found here: 
	https://developer.android.com/reference/android/view/KeyEvent#constants
*/
function inputKey(devices, key){
	return groupShellCmd(devices, ["input", "keyevent", key.toString()])
}


/*
	Turn off the devices
	Warning: there is no way to turn on devices via adb
*/
function shutdown(devices){
	return groupShellCmd(devices, ["reboot", "-p"])
}


/*
	Get the list of all packages installed of each device
*/
function getPackages(devices){

	var output = [];

	for(var i in devices){
		var temp = shellCmd(devices[i], ["cmd", "package", "list", "packages"])
		var packagelist = temp;

		packagelist = packagelist.split("\n")//clean up output
		for(var j in packagelist){
			packagelist[j] = packagelist[j].substring(8); 
		}
		output[devices[i]] = packagelist;
	}
	return output;
}


/*
	Returns a list of devices with their battery level
*/
function getBatteryLevel(devices){

	var output = [];

	for(var i in devices){

		var temp = shellCmd(devices[i], ["dumpsys",  "battery"]);
		temp = temp.split("\n");

		var level;

		for(var j in temp){
			temp[j] = temp[j].trim();
			if(temp[j].startsWith("level")){
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
function checkPackageInstalled(device, packageName){
	var output = shellCmd(device, ["pm", "list", "packages", packageName]);
	return output.includes(packageName);
}


/*
	Checks if the WifiSettingsManager is installed and if not, installes it (syncronous)
*/
function checkWifiManagerInstalled(device){
	if(!checkPackageInstalled(device, wifiManagerPackage)){
		installPackage([device], "wifiManager.apk");
	}
}


/*
	Checks if the wifi manager app is installed and installs it if not.
	Adds wifi network with just a password, or no password.
	There exists support to set static proxy.
	Wifi manager app: https://github.com/steinwurf/adb-join-wifi (BSD license)
	passwordType: WPA or WEP
*/
function addWifiNetwork(devices, ssid, passwordType, password){

	var ssid = echapSpaces(ssid); //replace <space> with \<space>
	var password = echapSpaces(password); //replace <space> with \<space>

	var output = [];

	for(var i in devices){
		checkWifiManagerInstalled(devices[i]); //make sure wifi manager is installed
		try{
			if(passwordType != "none"){
				output[devices[i]] = shellCmd(devices[i], ["am", "start", "-n", "com.steinwurf.adbjoinwifi/.MainActivity", "-e", "ssid", ssid, "-e", "password_type", passwordType, "-e", "password", password]);
			}
			else{
				output[devices[i]] = shellCmd(devices[i], ["am", "start", "-n", "com.steinwurf.adbjoinwifi/.MainActivity", "-e", "ssid", ssid]);
			}
		}
		catch(e){
			output[devices[i]] = e;
		}
		
		
	}

	return output;
}




/*
	toggle is boolean
*/
function toggleWifi(devices, toggle){

	var output = [];


	for(var i in devices){
		if(toggle){
			output[devices[i]] = shellCmd(devices[i], ["svc", "wifi", "enable"]);
		}
		else{
			output[devices[i]] = shellCmd(devices[i], ["svc", "wifi", "disable"]);
		}
	}
	
	return output;
}


/*
	Doesn't seem to work
*/
function forgetWifi(devices){

	var output = [];

	for(var i in devices){
		output[devices[i]] = shellCmd(devices[i], ["am", "startservice", "-n", "com.google.wifisetup/.WifiSetupService", "-a", "WiFiSetupService.Reset"]);
	}

	return output;

}


function checkWifiNetwork(devices){

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
	forgetWifi,
}