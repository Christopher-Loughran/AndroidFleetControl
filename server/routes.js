import * as express from 'express';
import * as adb from './adb.js';
import fileUpload from 'express-fileupload';
import fs from 'fs';



export const router = express.Router();
router.use(fileUpload());


/*
    Send a list of all devices connected by usb
*/
router.get('/devices', (req, res) => {
    let devices = adb.getDevices();
    res.send(devices);
});


/*
    Sends back an object containing the battery levels of each device
*/
router.post('/batterylevels', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.getBatteryLevel(devices);
    res.send(JSON.stringify(output));
});


/*

*/
router.post('/devicenames', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.getDeviceNames(devices);
    res.send(JSON.stringify(output));
});



/*
    Execute a shell command on selected devices, send back the results for each device
*/
router.post('/shellcmd', (req, res) => {
    let devices = req.body.deviceList; //get devices
    let cmd = req.body.cmd; //get shell command

    let output = adb.groupShellCmd(devices, cmd) //execute shell command and get back output
    res.send(JSON.stringify(output)); //send back output
});


/*
    Execute adb command on selected devices, send back the results for each device
*/
router.post('/adbcmd', (req, res) => {
    let devices = req.body.deviceList;
    let cmd = req.body.cmd;

    let output = adb.groupAdbCmd(devices, cmd)
    res.send(JSON.stringify(output));
});


/*
    Download package from front-end, install package on selected devices, delete package file (on server)
*/
router.post('/installpackage', function(req, res) {

    if (req.files.package == undefined || req.files.package == null) { //package wasn't uploaded properly
        res.status(415).send();
    }

    let file = req.files.package;
    let extras = JSON.parse(req.body.extras);
    let devices = extras.deviceList;
    let timeout = extras.timeout;


    if (file.mimetype == 'application/vnd.android.package-archive') { //check if package is an .apk
        file.mv(file.name, function(error, response) { //save file
            if (error) {
                res.status(415).send();
            } else { //file was successfully saved

                let output = adb.installPackage(devices, file.name, timeout); //install package
                res.send(JSON.stringify(output));
                fs.rm(file.name, () => {}); //delete file (no callback needed)
            }
        });
    } else {
        res.status(415).send("Wrong file type");
    }
});


/*

*/
router.post('/checkpackageinstalled', (req, res) => {
    let devices = req.body.deviceList;
    let packageName = req.body.packageName;

    let output = {};

    for (var i in devices) {
        output[devices[i]] = adb.checkPackageInstalled(devices[i], packageName);
    }

    res.send(JSON.stringify(output));
});


/*

*/
router.post('/installedpackages', (req, res) => {
    let devices = req.body.deviceList;

    let output = adb.getPackages(devices);
    res.send(JSON.stringify(output));
});


/*

*/
router.post('/uninstallpackage', (req, res) => {
    let devices = req.body.deviceList;
    let packageName = req.body.packageName;

    let output = adb.uninstallPackage(devices, packageName);

    res.send(JSON.stringify(output));
});


/*

*/
router.post('/uninstallmuliplepackages', (req, res) => {
    let devices = req.body.deviceList;
    let packageList = req.body.packageList;

    let output = adb.uninstallMuliplePackages(devices, packageList);

    res.send(JSON.stringify(output));
});


/*
    Download file from front-end, push to selected devices (root folder), delete file (on server)
*/
router.post('/pushfile', function(req, res) {

    if (req.files.file == undefined || req.files.file == null) { //file wasn't uploaded properly
        res.status(400).send("No file uploaded");
    }

    let file = req.files.file;
    let devices = JSON.parse(req.body.deviceList);


    file.mv(file.name, function(error, response) { //save file
        if (error) {
            res.status(400).send();
        } else { //file was successfully saved

            let output = adb.pushFiles(devices, file.name, "/sdcard/"); //push file
            res.send(JSON.stringify(output));
            fs.rm(file.name, () => {}); //delete file (no callback needed)
        }
    });

});


/*

*/
router.post('/deletefile', (req, res) => {
    let devices = req.body.deviceList;
    let filePath = req.body.filePath;

    let output = adb.deleteFile(devices, filePath);

    res.send(JSON.stringify(output));
});




/*
    For each device:
        attempt to pull the file
        if successful then
            convert the file data to 64 bit -> save in array
            delete the file from the server
        if unsuccessful then
            put error in array
    Send the array 
*/
router.post('/pullfile', (req, res) => {
    let devices = req.body.deviceList;
    let filePath = req.body.filePath;

    let splitFilePath = filePath.split("/"); //get filename from source
    let fileName = splitFilePath[splitFilePath.length - 1]

    let output = {}; //object containing {device1 : {success: true, data: 64bit_data, filename: filname}, device2 : {success: false, error: error message}, ...}

    for (var i in devices) {
        let success = adb.pullFiles(devices[i], filePath);

        if (success) {
            let newFileName = devices[i] + "_" + fileName; //file is renamed during pull
            let data = fs.readFileSync(newFileName, { encoding: 'base64', flag: 'r' });
            output[devices[i]] = { success: true, data: data, filename: newFileName };
            fs.rm(newFileName, () => {}); //delete file (no callback needed)
        } else {
            output[devices[i]] = { success: false, error: "File " + filePath + " does not exist on device " + devices[i] };
        }
    }

    res.send(JSON.stringify(output));
});


/*
    Adds wifi network, either with or without user
    No need to check if WifiManager is installed, this check is done within the adb function
*/
router.post('/addwifi', (req, res) => {
    let devices = req.body.deviceList;
    let ssid = req.body.ssid;
    let passwordType = req.body.passwordType;
    let password = req.body.password;

    if (passwordType == "") {
        passwordType = "none"
    }

    adb.addWifiNetwork(devices, ssid, passwordType, password);

    let output = adb.checkWifiNetwork(devices);
    res.send(JSON.stringify(output));
});


/*

*/
router.post('/disablewifi', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.toggleWifi(devices, false);
    res.send(JSON.stringify(output));
});


/*

*/
router.post('/enablewifi', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.toggleWifi(devices, true);
    res.send(JSON.stringify(output));
});


/*

*/
router.post('/forgetallwifi', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.forgetWifi(devices);
    res.send(JSON.stringify(output));
})


/*

*/
router.post('/recordscreen', (req, res) => {
    let devices = req.body.deviceList;
    let seconds = req.body.seconds
    let filesOutput = {}; //object containing {filename : 64bit_data, ...}
    let filenames = [];

    for (var i in devices) {
        filenames.push(adb.recordScreen(devices[i], seconds));
    }

    for (var i in filenames) {

        let data = fs.readFileSync(filenames[i], { encoding: 'base64', flag: 'r' });

        filesOutput[filenames[i]] = data

        fs.rm(filenames[i], () => {}); //delete file (no callback needed)
    }

    res.send(JSON.stringify(filesOutput));
})


/*

*/
router.post('/screencapture', (req, res) => {
    let devices = req.body.deviceList;
    let filesOutput = {}; //object containing {filename : 64bit_data, ...}
    let filenames = [];

    console.log(devices);

    for (var i in devices) {

        filenames.push(adb.screenCap(devices[i]));
    }

    for (var i in filenames) {

        let data = fs.readFileSync(filenames[i], { encoding: 'base64', flag: 'r' });

        filesOutput[filenames[i]] = data

        fs.rm(filenames[i], () => {}); //delete file (no callback needed)
    }


    res.send(JSON.stringify(filesOutput));
})


/*

*/
router.post('/getwificonnection', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.checkWifiNetwork(devices);
    res.send(JSON.stringify(output));
})