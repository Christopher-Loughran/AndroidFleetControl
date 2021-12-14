import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tablette',
  templateUrl: './tablette.component.html',
  styleUrls: ['./tablette.component.css']
})
export class TabletteComponent implements OnInit {
  url = "http://localhost:4201";

  devices = [];
  batteryLevels = [];
  output : string = ""; //testing purposes


  constructor(private http: HttpClient) {
    this.getDevices();//initialise devices list
  }
  ngOnInit(): void {
  }

    /*
    Select all 
   */
    toggle(source:any) {
      var checkboxes : NodeListOf<Element> = document.getElementsByName("tablette");
      var checkboxeSelectAll = document.getElementById('selectall')  as HTMLInputElement;
          
      for(var i=0, n=checkboxes.length;i<n;i++) {
          var ee = checkboxes[i]  as HTMLInputElement;
          if(checkboxeSelectAll.checked) ee.checked = true;  
          else{ 
            ee.checked = false;     
  
          }   
  
      }
    }


  /*
    Callback used to display any errors when a request doesn't work
  */
    displayError(error) {
      console.error('Request failed with error')
      console.log(error);
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
