import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tablette',
  templateUrl: './tablette.component.html',
  styleUrls: ['./tablette.component.css']
})
export class TabletteComponent implements OnInit {
  url = "http://localhost:4201";


  output : string = ""; //testing purposes

  @Input() devices: string[] = [];
  @Input() batteryLevels: number[] = [];
  @Input() wifiConnections: string[] = [];

  constructor(private http: HttpClient) {
    //this.refresh()//initialise devices list
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



}
