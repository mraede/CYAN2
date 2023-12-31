import { Component, OnInit } from '@angular/core';
import { latLng, tileLayer, marker, icon, Map, LayerGroup, popup, Marker, map, LatLng } from 'leaflet';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { Location } from '../models/location';

import { LocationService } from '../services/location.service';
import { MapService } from '../services/map.service';
import { AuthService } from '../services/auth.service';
import { DialogComponent } from '../shared/dialog/dialog.component';

// import { ConcentrationRanges } from '../test-data/test-levels';

@Component({
  selector: 'app-coordinates',
  templateUrl: './coordinates.component.html',
  styleUrls: ['./coordinates.component.css']
})
export class CoordinatesComponent implements OnInit {

	// cyan_ranges: ConcentrationRanges;

	marked: string = 'Check';

	selectedLat: string = 'N';
	selectedLon: string = 'W';

	northLat: number = 53; // north lat
	westLon: number = -130; // west long
	eastLon: number = -65; // east long
	southLat: number =  24; // south lat

	latDeg: number;
	latMin: number;
	latSec: number;

	lonDeg: number;
	lonMin: number;
	lonSec: number;

	latDec: number;  // decimal degrees
	lonDec: number;  // decimal degrees

	location: Location;

	units: object = {dms: "Degree-Minute-Seconds", dd: "Decimal Degrees"};
	defaultSelected: string = "dms";
	selectedKey: string = "dms";  // dms or dd

	showCoords: boolean = true;  // bool for displaying coordinates component

  constructor(
	private locationService: LocationService,
	private mapService: MapService,
	private authService: AuthService,
	private dialogComponent: DialogComponent,
	private errorDialog: MatDialog,
  ) { }

  ngOnInit() {
  	if (!this.authService.checkUserAuthentication()) { 
  		return;
  	}
  	this.showCoords = true;
  }

	markLocation(): void {
		if (!this.authService.checkUserAuthentication()) {
			return;
		}
		if (!this.validateCoords(this.selectedKey)) {
			this.displayError("Coordinates are not within CONUS");
			return;
		}
		this.location = this.getLocationData();
		this.locationService.setMarked(this.location, true);
		this.mapService.updateMarker(this.location);
		this.locationService.updateLocation(this.location.name, this.location);
		this.handleComponentDisplay();
	}

	compareLocation(): void {
		if (!this.authService.checkUserAuthentication()) {
			return;
		}
		if (!this.validateCoords(this.selectedKey)) {
			this.displayError("Coordinates are not within CONUS");
			return;
		}
		this.location = this.getLocationData();
		this.locationService.addCompareLocation(this.location);
		this.handleComponentDisplay();
	}

	getLocationData(): Location {
		/*
		requestType: 'compare' or 'mark'
		*/

		let map = this.mapService.getMap();

		let name = 'To Be Updated...';
		let cellCon = 0;
		let maxCellCon = 0;
		let cellChange = 0;
		let dataDate = '01/01/2018';
		let source = 'OLCI';
		let location: Location = new Location();
		location.latitude_deg = this.latDeg;
		location.latitude_min = this.latMin;
		location.latitude_sec = this.latSec;
		location.latitude_dir = this.selectedLat;
		location.longitude_deg = this.lonDeg;
		location.longitude_min = this.lonMin;
		location.longitude_sec = this.lonSec;
		location.longitude_dir = this.selectedLon;

		let latLon = null;
		if (this.selectedKey == "dms") {
			latLon = this.mapService.getLatLng(location);
		}
		else {
			latLon = new LatLng(this.latDec, this.lonDec);
		}

		location = this.locationService.createLocation(name, latLon.lat, latLon.lng, cellCon, maxCellCon, cellChange, dataDate, source);

		map.setView(latLon, 12);
		let m = this.mapService.addMarker(location);
		m.fireEvent('click');

		return location;
	}

	onSelect(selectedValue: any): void {

		let validCoords = this.validateCoords(this.selectedKey);  // check if existing coords to convert

		this.selectedKey = selectedValue.value;  // sets active coord type (dd or dms)

		if (validCoords !== true) {
			return;
		}

		if (this.selectedKey === 'dms') {
			let dmsCoords = this.mapService.convertDdToDms(this.latDec, this.lonDec);
			this.latDeg = dmsCoords[0][0];
			this.latMin = dmsCoords[0][1];
			this.latSec = dmsCoords[0][2];
			this.lonDeg = dmsCoords[1][0];
			this.lonMin = dmsCoords[1][1];
			this.lonSec = dmsCoords[1][2];
		}
		else if (this.selectedKey === 'dd') {
			let ddCoords = this.mapService.convertDmsToDd(this.latDeg, this.latMin, this.latSec, this.selectedLat, this.lonDeg, this.lonMin, this.lonSec, this.selectedLon);
			this.latDec = ddCoords[0];
			this.lonDec = ddCoords[1];
		}

	}

	validateCoords(coordType: string): boolean {
		/*
		Checks whether coordinates are within CONUS.
		*/
		let latLon = [];
		let latLonDms = [];
		if (coordType == "dms") {
			latLon = this.mapService.convertDmsToDd(this.latDeg, this.latMin, this.latSec, this.selectedLat, this.lonDeg, this.lonMin, this.lonSec, this.selectedLon);
		}
		else if (coordType == "dd") {
			latLon = [this.latDec, this.lonDec];
		}

		if (!this.withinConus(latLon[0], latLon[1])) {
			return false;
		}
		else {
			return true;
		}

	}

	withinConus(lat: number, lon: number): boolean {
		if (!(this.southLat <= lat && lat <= this.northLat)) {
			return false;
		}
		else if (this.westLon <= lon && lon <= this.eastLon) {
			return true;
		}
		else {
			return false;
		}
	}

	displayError(message: string): void {
		const dialogRef = this.errorDialog.open(DialogComponent, {
	      data: {
	        dialogMessage: message
	      }
	    });
	}

	handleComponentDisplay(): void {
		/*
		Removes coordinate component when "compare" or "mark"
		is selected for small screens.
		*/
		if (window.innerWidth <= 500) {
			this.showCoords = false;
		}
		else {
			this.showCoords = true;
		}
	}

}
