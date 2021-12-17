import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tablette',
  templateUrl: './tablette.component.html',
  styleUrls: ['./tablette.component.css']
})
export class TabletteComponent implements OnInit {
  url = "http://localhost:4201";


  /*
  Share data between child and parent directives and components  
  */
  @Output() eventChild = new EventEmitter<string[]>();

  devicesListSelection: string[] = [];

  @Input() devices: string[] = [];
  @Input() batteryLevels: number[] = [];
  @Input() wifiConnections: string[] = [];
  @Input() deviceNames: string[] = [];

  constructor(private http: HttpClient) {
    this.sendListDeviceSelection()
  }
  ngOnInit(): void {
  }


  /*
    Select all 
  */
  toggle(source: any) {
    var checkboxes: NodeListOf<Element> = document.getElementsByName("tablette");
    var checkboxeSelectAll = document.getElementById('selectall') as HTMLInputElement;

    for (var i = 0, n = checkboxes.length; i < n; i++) {
      var ee = checkboxes[i] as HTMLInputElement;
      const index = this.devicesListSelection.indexOf(ee.value);

      if (checkboxeSelectAll.checked) {
        ee.checked = true;
        if (index == -1) {
          this.devicesListSelection.push(ee.value);
          this.sendListDeviceSelection();

        }
      }
      else {
        ee.checked = false;
        if (index > -1) {
          this.devicesListSelection.splice(index, 1);
          this.sendListDeviceSelection();
        }
      }
    }
  }


  /*
    device  selection 
  */
  deviceSelection(source) {
    var checkboxes: NodeListOf<Element> = document.getElementsByName("tablette");

    for (var i = 0, n = checkboxes.length; i < n; i++) {
      var device = checkboxes[i] as HTMLInputElement;
      const index = this.devicesListSelection.indexOf(device.value);

      if ((device.checked) && (index == -1)) {
        this.devicesListSelection.push(device.value);
        this.sendListDeviceSelection();
      }
      else
        if ((!device.checked) && (index > -1)) {
          this.devicesListSelection.splice(index, 1);
          this.sendListDeviceSelection();


        }
    }
  }


  /*
  Share data between child and parent directives and components  
  */
  sendListDeviceSelection() {
    this.eventChild.emit(this.devicesListSelection);
  }
}
