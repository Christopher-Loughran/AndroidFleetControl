//const http = require('http');
//const child_process = require("child_process");

import child_process from 'child_process';

/*const hostname = '127.0.0.1';
const port = 3000;	

const server = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.end('Hello World');
	

});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
	testadb();

});







function testadb(){

	let output = ""

	devices = getDevices();

	//output = shellCmd(devices[0], ["ls", "-la"]);
	//output = groupShellCmd(devices, ["ls", "-la"]);

	//output = adbCmd(devices[0], "install vlc.apk");
	//output = adbCmd(devices[0], "uninstall org.videolan.vlc");

	//output = groupAdbCmd(devices, "install vlc.apk");
	//output = groupAdbCmd(devices, "uninstall org.videolan.vlc");

	//output = installPackage(devices, "vlc.apk");
	//output = uninstallPackage(devices, "org.videolan.vlc");

	//output = pushFiles(devices, "./randomFile", "/sdcard/");
	//output = pullFiles(devices, "./sdcard/randomFile");
	//output = deleteFile(devices, "./sdcard/randomFile");

	//output = screenCap(devices);
	//output = recordScreens(devices, 3);

	//output = inputKey(devices, 3); //home
	output = shutdown(devices);

	//output = getPackages(devices);

	//output = getBatteryLevel(devices);

	console.log(output);
}*/


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
	Blocks execution for x milliseconds 
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
	Execute a chain of shell commands on a group of devices in parallel
	No need to put "adb shell ..." in commands list
	Each option/parameter must be it's own item in the commands list
*/
function groupShellCmd(devices, cmds){

	output = [];

	for(var i in devices){
		output.push(shellCmd(devices[i], cmds))
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
	args = ["-s", device].concat(cmd.split(" "))

	const adbProccess = child_process.spawnSync('adb', args);

	return adbProccess.stdout.toString();
}


/*
	Execute one adb command on a group of devices
	No need to put "adb" in command
*/
function groupAdbCmd(devices, cmd){

	output = [];

	for(var i in devices){
		temp = adbCmd(devices[i], cmd)
		output.push(temp);
	}

	return output;
}


/*
	Installs an app from an .apk file
	packageName: example.apk (apk file must be on the pc not the device)
*/
function installPackage(devices, packageName){
	cmd = "install " + packageName
    return groupAdbCmd(devices, cmd)
}


/*
	Uninstalls a package
	packageName: com.example.appname
*/
function uninstallPackage(devices, packageName){
	cmd = "uninstall " + packageName
    return groupAdbCmd(devices, cmd)
}
    

/*
	Transfer files from pc to device
	dest should start with ./sdcard/...
*/
function pushFiles(devices, src, dest){
    cmd = "push " + src + " " + dest
    return groupAdbCmd(devices, cmd)
}


/*
	Transfer files from device to pc
	src should start with ./sdcard/...
*/
function pullFiles(devices, src){
    cmd = "pull " + src + " ."
    cmdOutput = groupAdbCmd(devices, cmd);

	output = [];

	for(var i in cmdOutput){
		temp = cmdOutput[i].split("\n");
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
    cmds = ["rm", filepath]
    return groupShellCmd(devices, cmds)
}


/*
	Take a screenshot of the device and retrieve the file
*/
function screenCap(devices){

	let timestamp = Date.now();

	var output = [];

	for(var i in devices){

		let filename = "screencap_" + devices[i] + "_" + timestamp.toString() + ".png"; //define name of file
		shellCmd(devices[i], ["screencap", "/sdcard/" + filename]); //perform screenshot
		syncDelay(3*1000); //wait for image to be saved
		temp = pullFiles([devices[i]], "/sdcard/" + filename) //pull image file
		output.push(temp[devices[i]]); //set pull output as output
		deleteFile([devices[i]], "/sdcard/" + filename); //delete image file on device
	}

	return output;
}


/*
	Record screen for n seconds and retrieve video file
	Doesn't work too well for very short videos (less than 5 seconds)
*/
function recordScreens(devices, seconds){ //maybe change this to record just one screen 

	let timestamp = Date.now();

	var output = [];

	for(var i in devices){
		let filename = "recording_" + devices[i] + "_" + timestamp.toString() + ".mp4"; //define name of file
		shellCmd(devices[i], ["screenrecord", "/sdcard/" + filename, "--time-limit=" + seconds.toString()]); //perform recording
		syncDelay(seconds*1000); //wait for recording to be finished
		temp = pullFiles([devices[i]], "/sdcard/" + filename); //pull video file
		output.push(temp[devices[i]]); //set pull output as output
		deleteFile([devices[i]], "/sdcard/" + filename); //delete video file on device
	}

	return output;
}


/*
	Input a keyevent; key is an int
*/
function inputKey(devices, key){
	return groupShellCmd(devices, ["input", "keyevent", key.toString()])
}


/*
	Turn off the devices
*/
function shutdown(devices){
	return groupShellCmd(devices, ["reboot", "-p"])
}


/*
	Get a list of all packages installed of each device
*/
function getPackages(devices){

	output = [];

	for(var i in temp){
		temp = shellCmd(devices[i], ["cmd", "package", "list", "packages"])
		packagelist = temp;
		packagelist = packagelist.split("\n")
		for(j in packagelist){
			packagelist[j] = packagelist[j].substring(8);
		}
		output[devices[i]] = packagelist;
	}

	return output;
}


/*
	Returns a list of 
*/
function getBatteryLevel(devices){

	var output = [];

	for(var i in devices){

		temp = shellCmd(devices[i], ["dumpsys",  "battery"]);
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
    

export { getDevices, shellCmd, groupShellCmd, adbCmd, groupAdbCmd, installPackage, 
	uninstallPackage, pushFiles, pullFiles, deleteFile, screenCap, recordScreens, inputKey, getPackages, getBatteryLevel}