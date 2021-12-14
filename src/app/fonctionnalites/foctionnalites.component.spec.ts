import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoctionnalitesComponent } from './foctionnalites.component';

describe('FoctionnalitesComponent', () => {
  let component: FoctionnalitesComponent;
  let fixture: ComponentFixture<FoctionnalitesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FoctionnalitesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FoctionnalitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
