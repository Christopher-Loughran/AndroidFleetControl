import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { environment } from 'src/environments/environment';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent{
  title = 'FleetControl';
  url = environment.server_url;


  devices = [];
  batteryLevels = [];
  shellcmd : string = "";
  adbcmd: string = "";
  packageFormData = new FormData(); //used to transfer an apk to be installed
  packageNameCheck: string = "";
  packageToUninstall: string = "";
  fileFormData = new FormData(); //used to push files
  fileToDelete: string = "";
  fileToPull: string = "";
  wifissid: string = "";
  wifiusername: string = "";
  wifiPasswordType: string = "WPA";
  wifipassword: string = "";
  recordTime: number = 5;
  
  
  output : string = ""; //testing purposes


  

  constructor(private http: HttpClient) {
    this.getDevices();//initialise devices list
  }


  /*
    Callback used to display any errors when a request doesn't work
  */
  displayError(error: Error) {
    console.error('Request failed with error')
    console.log(error);
  }


  /*
    Convert {keys: [a, b, c], values: [10, 20, 30]} to [a: 10, b: 20, c: 30]
  */
  objectToArray(object: any){
    var array = [];

    if(object.keys.length == object.values.length){
      for(var i in object.keys){
        array[object.keys[i]] = object.values[i];
      }
    }
    else{
      console.error("Mismatched key=>value object:")
      console.error(object);
    }
    return array;
  }


  /*
    Converts a 64bit data string into a blob used to download files
  */
  base64ToBlob(b64Data, contentType='', sliceSize=512) {
    b64Data = b64Data.replace(/\s/g, ''); //IE compatibility...
    let byteCharacters = atob(b64Data);
    let byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        let slice = byteCharacters.slice(offset, offset + sliceSize);

        let byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        let byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
  }


  /*
    Download a file from a filename + data
  */
  downloadFile(filename: string, b64encodedString: string) {
    if (b64encodedString) {
      var blob = this.base64ToBlob(b64encodedString, 'text/plain');
      saveAs(blob, filename);
    }
  }


  /*
    gets all connected devices, store them in this.devices
  */
  getDevices(){
    this.http.get<any[]>(this.url+'/devices').subscribe(
      (response) => {
        this.devices = response;
        this.getBatteryLevels(this.devices);
      },
      (error) => { this.displayError(error)});
  }


  /*
    Get the battery level for selected devices, store them in this.batteryLevels
  */
  getBatteryLevels(devices: string[]){
    this.http.post<any[]>(this.url+'/batterylevels', {deviceList: devices}).subscribe(
      (response) => {

        this.batteryLevels = this.objectToArray(response);
        console.log(response)
      },
      (error) => { this.displayError(error)});
  }


  /*
    Send an adb shell command to selected devices
  */
  shellCommand(devices: string[], cmd: string){
    this.http.post<any>(this.url+'/shellcmd', {deviceList: devices, cmd: cmd}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Send an adb command to selected devices
  */
  adbCommand(devices: string[], cmd: string){
    this.http.post<any>(this.url+'/adbcmd', {deviceList: devices, cmd: cmd}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Adds the apk (to be installed) to the package form data to be sent later
  */
  handlePackage(target) {
    var files = target.files;
    this.packageFormData.delete('package');
    this.packageFormData.append('package', files[0]);
  }
  /*
    Sends the apk to the server to be installed
  */
  installPackage(devices: string[]){

    this.packageFormData.delete('deviceList');
    this.packageFormData.append('deviceList', JSON.stringify(devices)); //formData can't accept array, must be stringified and parsed at other end

    return this.http.post<any>(this.url+'/installpackage', this.packageFormData).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Check if a package (com.example.appname) is installed on selected devices
  */
  checkPackageInstalled(devices: string[], packageName: string){
    this.http.post<any>(this.url+'/checkpackageinstalled', {deviceList: devices, packageName: packageName}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }

  
  /*
    Returns a list of all installed packages on each device
  */
  getInstalledPackages(devices: string[]){
    this.http.post<any[]>(this.url+'/installedpackages', {deviceList: devices}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Uninstalls a package
    packageName: 'com.example.appname'
  */
  uninstallPackage(devices: string[], packageName: string){
    this.http.post<any>(this.url+'/uninstallpackage', {deviceList: devices, packageName: packageName}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
}



  /*
    Adds the file (to be pushed) to the file form data to be sent later
  */
  handleFile(target) {
    var files = target.files;
    this.fileFormData.delete('file');
    this.fileFormData.append('file', files[0]);
  }
  /*
    Sends the file to the server
  */
  pushFile(devices: string[]){
    this.fileFormData.delete('deviceList');
    this.fileFormData.append('deviceList', JSON.stringify(devices)); //formData can't accept array, must be stringified and parsed at other end

    return this.http.post<any>(this.url+'/pushfile', this.fileFormData).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Deletes a file on selected devices
  */
  deleteFile(devices: string[], filePath: string){
    this.http.post<any>(this.url+'/deletefile', {deviceList: devices, filePath: filePath}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Get array with shape [filename1 : 64bit_data1, filename2, 64bit_data2, ...]
    for each file, download file.
    Tested for upto 15Ko so far...
  */
  pullFile(devices: string[], filePath: string){
    this.http.post<any>(this.url+'/pullfile', {deviceList: devices, filePath: filePath}).subscribe(
      (response) => {
        console.log(response);

        var files = this.objectToArray(response);

        for(var i in files){
          this.downloadFile(i, files[i]);
        }
      },
      (error) => { this.displayError(error)});
  }


  /*
    Add a wifi network
    passwordType : 'WPA'/'WEP'/'none' (if none password will not be taken into account)
  */
  addWifi(devices: string[], ssid: string, password: string, passwordType: string){

    this.http.post<any>(this.url+'/addwifi', {deviceList: devices, ssid: ssid, passwordType: passwordType, password: password}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Turn wifi off
  */
  disableWifi(devices: string[]){
    this.http.post<any>(this.url+'/disablewifi', {deviceList: devices, toggle: false}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Turn wifi on
  */
  enableWifi(devices: string[]){
    this.http.post<any>(this.url+'/enablewifi', {deviceList: devices, toggle: true}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Doesn't seem to work
  */
  forgetAllWifi(devices: string[]){
    this.http.post<any>(this.url+'/forgetallwifi', {deviceList: devices}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Record the screen of selected devices for n seconds then download the files
  */
  recordScreen(devices: string[], seconds: number){
    this.http.post<any>(this.url+'/recordscreen', {deviceList: devices, seconds: seconds}).subscribe(
      (response) => {
        console.log(response);

        var files = this.objectToArray(response);

        for(var i in files){
          this.downloadFile(i, files[i]);
        }
      },
      (error) => { this.displayError(error)});
  }


  /*
    Get a screen capture of selected devices and download then download the files
  */
  screenCapture(devices: string[]){
    this.http.post<any>(this.url+'/screencapture', {deviceList: devices}).subscribe(
      (response) => {
        console.log(response);

        var files = this.objectToArray(response);

        for(var i in files){
          this.downloadFile(i, files[i]);
        }
      },
      (error) => { this.displayError(error)});
  }


  /*

  */
  getWifiConnection(devices: string[]){
    this.http.post<any>(this.url+'/getwificonnection', {deviceList: devices}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }




}
