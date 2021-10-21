const http = require('http');
const child_process = require("child_process");
const async = require("async");


const hostname = '127.0.0.1';
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

	output = ""

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
	//output = recordScreens(devices, 10);

	//output = inputKey(devices, 3); //home

	output = shutdown(devices);

	console.log(output);
}




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


//get list of device names
function getDevices(){

	const adbProccess = child_process.spawnSync('adb', ["devices"]);

	let output = adbProccess.stdout.toString();

	output = output.split("\n");
	output.splice(0, 1);

	devices = [];

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

	async.forEachOf(devices, (device, index, callback) => {
		output.push(shellCmd(device, cmds))
		//callback();
	})

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

	async.forEachOf(devices, (device, index, callback) => {
		output.push(adbCmd(device, cmd))
		//callback();
	})

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
    return groupAdbCmd(devices, cmd)
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
	output doesn't seem to work
*/
function screenCap(devices){

	let timestamp = Date.now();

	output = [];

	async.forEachOf(devices, async (device, index, callback) => {
		let filename = "screencap_" + device + "_" + timestamp.toString() + ".png"
		shellCmd(device, ["screencap", "/sdcard/" + filename])
		await sleep(1000);
		output.push(pullFiles([device], "/sdcard/" + filename)[0]);
		deleteFile([device], "/sdcard/" + filename);
		//callback();
	})

	return output;
}


/*
	Record screen for n seconds and retrieve video file
	Doesn't work too well for very short videos (less than 5 seconds)
*/
function recordScreens(devices, seconds){

	let timestamp = Date.now();

	output = [];

	async.forEachOf(devices, async (device, index, callback) => {
		let filename = "recording_" + device + "_" + timestamp.toString() + ".mp4"
		shellCmd(device, ["screenrecord", "/sdcard/" + filename, "--time-limit=" + seconds.toString()]);
		await sleep(seconds*1000);
		output.push(pullFiles([device], "/sdcard/" + filename)[0]);
		deleteFile([device], "/sdcard/" + filename);
		//callback();
	})

	return output;
}


function inputKey(devices, key){
	return groupShellCmd(devices, ["input", "keyevent", key.toString()])
}


function shutdown(devices){
	return groupShellCmd(devices, ["reboot", "-p"])
}
    

