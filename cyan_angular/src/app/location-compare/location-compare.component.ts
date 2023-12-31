import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Location } from '../models/location';
import { LocationService } from '../services/location.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-location-compare',
  templateUrl: './location-compare.component.html',
  styleUrls: ['./location-compare.component.css']
})
export class LocationCompareComponent implements OnInit {

  selected_locations: Location[];

  constructor(
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService
   ) {}

  ngOnInit() {

    if (!this.authService.checkUserAuthentication()) { return; }

    this.getLocations();
    if (this.selected_locations === undefined) {
      this.selected_locations = [];
    }
  }

  getLocations(): void {
    this.locationService.getCompareLocations().subscribe(locations => {
      this.selected_locations = locations
    });
    
    this.locationService.getLocations('').subscribe(locations => {
      // Update any data/info for compare locations.
      locations.forEach(location => {
        // Find matching ID, then update anything in selected_compare from location
        let locIndex = this.selected_locations.map((item) => { return item.id; }).indexOf(location.id);
        if (locIndex > -1) {
          this.selected_locations[locIndex] = location;
        }
      });
    });    

  }

  removeLocation(loc: Location): void {
    if (!this.authService.checkUserAuthentication()) { return; }
    // Removes location from selected locations array:
    let locIndex = this.selected_locations.map((item) => { return item.id; }).indexOf(loc.id);
    if (locIndex > -1) {
      // this.selected_locations.splice(locIndex, 1);
      this.locationService.deleteCompareLocation(loc);
    }
  }

  hasLocations(): boolean {
    if (this.selected_locations.length > 0) {
      return true;
    } else {
      return false;
    }
  }

  getPercentage(l: Location) {
    return this.locationService.getPercentage(l);
  }

  getPercentage2(l: Location) {
    return this.locationService.getPercentage2(l);
  }

  getColor(l: Location, delta: boolean) {
    let color = this.locationService.getColor(l, delta);
    
    if (color === 'green') { color = 'rgb(0, 128, 0)'; }
    if (color === 'yellow') { color = 'rgb(200, 200, 0)'; }
    if (color === 'orange') { color = 'rgb(255, 165, 0)'; }
    if (color === 'red') { color = 'rgb(255, 0, 0)'; }
    return color;
  }

  getArrow(l: Location) {
    return this.locationService.getArrow(l);
  }
  
  // returns a css class with arrow image background
  getArrowColor(l: Location, delta: boolean) {
    return this.locationService.getColor(l, delta);
  }

  formatNumber(n: number) {
    return this.locationService.formatNumber(n);
  }

  compareLocations() {
    /*
    Opens location compare details.
    */
    if (!this.authService.checkUserAuthentication()) { return; }
    
    // Checks that > 1 location exists before routing to location-compare-details:
    if (this.selected_locations.length < 2) {
      this.dialog.open(LocationCompareAlert, {
        data: {}
      });
      return;
    }

    this.router.navigate(['/locationcomparedetails',
      {
        locations: this.selected_locations.map((ln: Location) => ln.id),
        current_location: this.selected_locations[0].id  // testing with current_location
      }
    ]);
  }
}



@Component({
  selector: 'location-compare-alert',
  styleUrls: ['./location-compare.component.css'],
  template: `
  <button mat-button (click)="exit();" class="details_exit">x</button>
  <br><br>
  <h6>Must have at least two locations selected for comparing.</h6>
  <br><br>
  <div style="display: flex; justify-content: center;">
  <button mat-button class="compare-btn mat-button" (click)="exit();">OK</button>
  </div>
  <br>
  `
})
export class LocationCompareAlert {

  constructor(
    public dialogRef: MatDialogRef<LocationCompareAlert>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
  }

  exit(): void {
    this.dialogRef.close();
  }
}