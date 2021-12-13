import * as express from 'express';
import * as adb from './adb.js';
import  fileUpload from 'express-fileupload';
import fs from 'fs';



export const router = express.Router();
router.use(fileUpload());


/*
    [a: 10, b: 20, c: 30] => {keys: ['a', 'b', 'c'], values: [10, 20, 30]}
    Useful because express won't send key, value array
*/
function arrayToObject(array){
    let keys = [];
    let values = [];

    for(var i in array){
        keys.push(i);
        values.push(array[i])
    }

    return {'keys': keys, 'values': values};
}



/*
    Send a list of all devices connected by usb
*/
router.get('/devices', (req, res) => {
    let devices = adb.getDevices();
    res.send(devices);
});


/*

*/
router.post('/batterylevels', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.getBatteryLevel(devices);
    res.send(arrayToObject(output));
});

/*
    Execute a shell command on selected devices, send back the results for each device
*/
router.post('/shellcmd', (req, res) => {
    let devices = req.body.deviceList; //get devices
    let cmd = req.body.cmd; //get shell command

    let output = adb.groupShellCmd(devices, cmd) //execute shell command and get back output
    res.send(arrayToObject(output)); //send back output
});


/*
    Execute adb command on selected devices, send back the results for each device
*/
router.post('/adbcmd', (req, res) => {
    let devices = req.body.deviceList;
    let cmd = req.body.cmd;

    let output = adb.groupAdbCmd(devices, cmd)
    res.send(arrayToObject(output));
});


/*
    Download package from front-end, install package on selected devices, delete package file (on server)
*/
router.post('/installpackage', function (req, res) {

    if (req.files.package == undefined || req.files.package == null) { //package wasn't uploaded properly
        res.status(415).send();
    }
    
    let file = req.files.package;
    let devices = JSON.parse(req.body.deviceList);


    console.log(file);


    //console.log("Installing " + file.name + " on the following devices: " +  devices);

    
    if (file.mimetype == 'application/vnd.android.package-archive') { //check if package is an .apk
        file.mv(file.name, function (error, response) {//save file
            if (error) {
                res.status(415).send();
            }
            else { //file was successfully saved

                let output = adb.installPackage(devices, file.name); //install package
                res.send(arrayToObject(output));
                fs.rm(file.name, ()=>{}); //delete file (no callback needed)
            }
        });
    }
    else {
        res.status(415).send("Wrong file type");
    }
});


/*

*/
router.post('/checkpackageinstalled', (req, res) => {
    let devices = req.body.deviceList;
    let packageName = req.body.packageName;

    let output = [];

    for(var i in devices){
        output[devices[i]] = adb.checkPackageInstalled(devices[i], packageName);
    }

    res.send(arrayToObject(output));
});


/*

*/
router.post('/installedpackages', (req, res) => {
    let devices = req.body.deviceList;

    let output = adb.getPackages(devices);
    res.send(arrayToObject(output));
});


/*

*/
router.post('/uninstallpackage', (req, res) => {
    let devices = req.body.deviceList;
    let packageName = req.body.packageName;

    let output = adb.uninstallPackage(devices, packageName);

    res.send(arrayToObject(output));
});


/*
    Download file from front-end, push to selected devices (root folder), delete file (on server)
*/
router.post('/pushfile', function (req, res) {

    if (req.files.file == undefined || req.files.file == null) { //file wasn't uploaded properly
        res.status(400).send("No file uploaded");
    }
    
    let file = req.files.file;
    let devices = JSON.parse(req.body.deviceList);

    
    file.mv(file.name, function (error, response) {//save file
        if (error) {
            res.status(400).send();
        }
        else { //file was successfully saved

            let output = adb.pushFiles(devices, file.name, "/sdcard/"); //push file
            res.send(arrayToObject(output));
            fs.rm(file.name, ()=>{}); //delete file (no callback needed)
        }
    });
    
});


/*

*/
router.post('/deletefile', (req, res) => {
    let devices = req.body.deviceList;
    let filePath = req.body.filePath;

    let output = adb.deleteFile(devices, filePath); //no feedback

    res.send(arrayToObject(output));
});


/*
    Pull all files, then

    For each device: 
        rename the file to deviceName_fileName.ext
        convert the file data to 64 bit -> save in array
        delete the file
    Send the array 
*/
router.post('/pullfile', (req, res) => {
    let devices = req.body.deviceList;
    let filePath = req.body.filePath;
    let filesOutput = []; //array containing [filename : 64bit_data, ...]

    let splitFilePath = filePath.split("/"); //get filename from source
    let fileName = splitFilePath[splitFilePath.length-1]

    let output = adb.pullFiles(devices, filePath);

    for(var i in devices){
        let newFileName = devices[i]+"_"+fileName
        
        let data = fs.readFileSync(newFileName, {encoding:'base64', flag:'r'});

        filesOutput[newFileName] = data

        fs.rm(newFileName, ()=>{}); //delete file (no callback needed)
    }

    res.send(arrayToObject(filesOutput));
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

    if(passwordType == ""){
        passwordType = "none"
    }

    let output = adb.addWifiNetwork(devices, ssid, passwordType, password);
    
    res.send(arrayToObject(output));
});


/*

*/
router.post('/disablewifi', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.toggleWifi(devices, false);
    res.send(arrayToObject(output));
});


/*

*/
router.post('/enablewifi', (req, res) => {
    let devices = req.body.deviceList;
    let output = adb.toggleWifi(devices, true);
    res.send(arrayToObject(output));
});


/*

*/
router.post('/forgetallwifi', (req, res) =>{
    let devices = req.body.deviceList;
    let output = adb.forgetWifi(devices);
    res.send(arrayToObject(output));
})


/*

*/
router.post('/recordscreen', (req, res) =>{
    let devices = req.body.deviceList;
    let seconds = req.body.seconds
    let filesOutput = []; //array containing [filename : 64bit_data, ...]
    let filenames = [];

    for(var i in devices){
        filenames.push(adb.recordScreen(devices[i], seconds));
    }

    for(var i in filenames){
        
        let data = fs.readFileSync(filenames[i], {encoding:'base64', flag:'r'});

        filesOutput[filenames[i]] = data

        fs.rm(filenames[i], ()=>{}); //delete file (no callback needed)
    }

    res.send(arrayToObject(filesOutput));
})












