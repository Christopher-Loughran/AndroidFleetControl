import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';





@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'FleetControl';
  url = environment.server_url;

  devicesListSelection: string[] = [];

  devices: string[] = [];
  batteryLevels: number[] = [];
  wifiConnections: string[] = [];
  deviceNames: string[] = [];


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
    Convert {a: 10, b: 20, c: 30} to [a: 10, b: 20, c: 30]
  */
  objectToArray(object: Object) {

    var array = [];

    for (var i in object) {
      array[i] = object[i];
    }
    return array;
  }

  /*
    Refreshes the device list and gets their battery level
  */
  refresh() {
    this.getDevices();
  }


  /*
    Gets all connected devices, store them in this.devices
  */
  getDevices() {
    this.http.get<any[]>(this.url + '/devices').subscribe(
      (response) => {
        this.devices = response;
        this.getDeviceNames(this.devices);
        this.getBatteryLevels(this.devices);
        this.getWifiConnection(this.devices);
        
      },
      (error) => { this.displayError(error) });
  }


  /*
    Get the battery level for selected devices, store them in this.batteryLevels
  */
  getBatteryLevels(devices: string[]) {
    this.http.post<any[]>(this.url + '/batterylevels', { deviceList: devices }).subscribe(
      (response) => {

        console.log(response)
        this.batteryLevels = this.objectToArray(response)
      },
      (error) => { this.displayError(error) });
  }


  /*
    Gets the name of the wi-fi network for each device
  */
  getWifiConnection(devices: string[]) {
    this.http.post<any>(this.url + '/getwificonnection', { deviceList: devices }).subscribe(
      (response) => {
        console.log(response);
        this.wifiConnections = this.objectToArray(response);
      },
      (error) => { this.displayError(error) });
  }


  /*
    Get the name of each device
  */
  getDeviceNames(devices: string[]){
    this.http.post<any[]>(this.url + '/devicenames', { deviceList: devices }).subscribe(
      (response) => {
        console.log(response)
        this.deviceNames = this.objectToArray(response)
      },
      (error) => { this.displayError(error) });
  }


  /*
    Gets all selected devices, store them in this.devicesListSelection
  */
  getDevicesSelection(data) {
    this.devicesListSelection=data;

  }


  /*
    
  */
  getdd(){
    console.log(this.devicesListSelection.length);
    console.log(this.devicesListSelection[0]);
  }


}
