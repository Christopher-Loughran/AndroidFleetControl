import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent{
  title = 'FleetControl';
  url = "http://localhost:4201";

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
  wifipassword: string = "";
  
  output : string = ""; //testing purposes


  

  constructor(private http: HttpClient) {
    this.getDevices();//initialise devices list
  }


  /*
    Callback used to display any errors when a request doesn't work
  */
  displayError(error) {
    console.error('Request failed with error')
    console.log(error);
  }

  /*
    Convert {keys: [a, b, c], values: [10, 20, 30]} to [a: 10, b: 20, c: 30]
  */
  objectToArray(object){
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
  downloadFile(filename, b64encodedString: string) {
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
  getBatteryLevels(devices){
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
  shellCommand(devices, cmd){
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
  adbCommand(devices, cmd){
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
  installPackage(devices){

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
  checkPackageInstalled(devices, packageName){
    this.http.post<any>(this.url+'/checkpackageinstalled', {deviceList: devices, packageName: packageName}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }

  
  /*

  */
  getInstalledPackages(devices){
    this.http.post<any[]>(this.url+'/installedpackages', {deviceList: devices}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*

  */
 uninstallPackage(devices, packageName){
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
  pushFile(devices){
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

  */
  deleteFile(devices, filePath){
    this.http.post<any>(this.url+'/deletefile', {deviceList: devices, filePath: filePath}).subscribe(
      (response) => {
        console.log(response);
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*
    Get array with shape [filename1 : 64bit_data1, filename2, 64bit_data2, ...]
    for each file, save file.
    Tested for upto 15Ko so far...
  */
  pullFile(devices, filePath){
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
    
  */
  addWifi(devices, ssid, password){

    var passwordType = "WPA"; //WPA/WEP/none (if none password will not be taken into account)

    this.http.post<any>(this.url+'/addwifi', {deviceList: devices, ssid: ssid, passwordType: passwordType, password: password}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*

  */
  disableWifi(devices){
    this.http.post<any>(this.url+'/disablewifi', {deviceList: devices, toggle: false}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


  /*

  */
  enableWifi(devices){
    this.http.post<any>(this.url+'/enablewifi', {deviceList: devices, toggle: true}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }


   /*

  */
  forgetAllWifi(devices){
    this.http.post<any>(this.url+'/forgetallwifi', {deviceList: devices}).subscribe(
      (response) => {
        this.output = response.values[0];
      },
      (error) => { this.displayError(error)});
  }



}
