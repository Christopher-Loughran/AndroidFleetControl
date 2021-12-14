import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabletteComponent } from './tablette.component';

describe('TabletteComponent', () => {
  let component: TabletteComponent;
  let fixture: ComponentFixture<TabletteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TabletteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
