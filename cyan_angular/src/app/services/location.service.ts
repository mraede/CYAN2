import { Injectable, Input } from '@angular/core';
import { Observable, of, Subscription, Subject } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { marker, icon, Map } from 'leaflet';

import { Location } from '../models/location';
import { UserService, UserLocations, User } from '../services/user.service';
import { ConfigService } from '../services/config.service';
import { DownloaderService } from '../services/downloader.service';
import { ConcentrationRanges } from '../test-data/test-levels';
import { MapService } from '../services/map.service';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  userLocations: UserLocations = null;

  test_levels: any;
  @Input() locations: Location[] = [];
  @Input() compare_locations: Location[] = [];

  // Inspired by: https://angular.io/guide/component-interaction#parent-and-children-communicate-via-a-service
  private compareLocationsSource = new Subject<Location[]>();  // observable Location[] sources
  compare$ = this.compareLocationsSource.asObservable();  // observable Location[] streams

  downloaderSub: Subscription;
  userSub: Subscription;

  constructor(
    private _sanitizer: DomSanitizer,
    private user: UserService,
    private configService: ConfigService,
    private downloader: DownloaderService,
    private mapService: MapService
  ) {
    this.getCyanLevels();
    this.loadUser();
    // this.compareLocations = new Subject<Location[]>();
  }

  loadUser() {
    let self = this;
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    this.userSub = this.user.getUserDetails().subscribe((user: User) => {
      if (user != null) {
        if (user.username != '') {
          setTimeout(function() {
            self.getUserLocations();
          }, 1000);
        } else {
          setTimeout(function() {
            self.loadUser();
          }, 1000);
        }
      } else {
        setTimeout(function() {
          self.loadUser();
        }, 1000);
      }
    });
  }

  getUserLocations() {
    let self = this;
    let username = this.user.getUserName();
    this.user.getUserLocations().subscribe((locations: UserLocations[]) => {
      if (locations.length != 0) {
        let loc = [];
        locations.forEach(function(location) {
          if (!self.locationIDCheck(location.id)) {
            let l = new Location();
            l.id = location.id;
            l.name = location.name;
            let coord = self.convertCoordinates(location.latitude, location.longitude);
            l.latitude = location.latitude;
            l.longitude = location.longitude;
            l.latitude_deg = coord.latDeg;
            l.latitude_min = coord.latMin;
            l.latitude_sec = coord.latSec;
            l.latitude_dir = coord.latDir;
            l.longitude_deg = coord.lngDeg;
            l.longitude_min = coord.lngMin;
            l.longitude_sec = coord.lngSec;
            l.longitude_dir = coord.lngDir;
            l.cellConcentration = 0;
            l.maxCellConcentration = 0;
            l.source = '';
            l.concentrationChange = 0;
            l.changeDate = '';
            l.dataDate = '';
            l.marked = location.marked == true ? true : false;
            l.notes = location.notes == '' ? '' : JSON.parse(location.notes);
            l.sourceFrequency = '';
            l.validCellCount = 0;
            loc.push(l);
          }
        });

        self.downloader.loadLocations(loc);
        loc.forEach(function(ln) {
          self.downloadLocation(ln);
        });
        let map = self.mapService.getMap();
        this.locations = loc;
        self.addMarkers(map);
      }
    });
  }

  locationIDCheck(id: number): Boolean {
    let inLocations = false;
    this.locations.forEach(function(location) {
      if (location.id == id) {
        inLocations = true;
      }
    });
    return inLocations;
  }

  getCyanLevels(): void {
    this.configService.getLevels().subscribe(levels => (this.test_levels = levels));
  }

  getAllLocations(): Observable<Location[]> {
    return of(this.locations);
  }

  downloadLocation(location: Location): void {
    let username = this.user.getUserName();
    this.downloader.getAjaxData(username, location);
    this.getData();
  }

  getData(): void {
    this.downloaderSub = this.downloader.getData().subscribe((locations: Location[]) => {
        this.locations = locations;
      }
    );
  }

  getLocationData(): Observable<Location[]> {
    return of(this.locations);
  }

  // NOTE: Will not filter locations within service, set source type in my-locations
  getLocations(src: string): Observable<Location[]> {
    src = src == 'MERIS' ? 'MERIS' : 'OLCI';
    //TODO: add filtering for data source
    return of(this.locations);
  }

  getStaticLocations(): Location[] {
    return this.locations;
  }

  getLocationByID(id: number): Location {
    return this.locations.filter(ln => {
      return ln.id == id;
    })[0];
  }

  createLocation(
    name: string,
    latitude: number,
    longitude: number,
    cellCon: number,
    maxCellCon: number,
    cellConChange: number,
    dataDate: string,
    source: string
  ): Location {

    let l = new Location();
    let c = this.convertCoordinates(latitude, longitude);
    l.id = this.getLastID() + 1;
    l.name = name;
    l.latitude = latitude;
    l.longitude = longitude;
    l.latitude_deg = c.latDeg;
    l.latitude_min = c.latMin;
    l.latitude_sec = c.latSec;
    l.latitude_dir = c.latDir;
    l.longitude_deg = c.lngDeg;
    l.longitude_min = c.lngMin;
    l.longitude_sec = c.lngSec;
    l.longitude_dir = c.lngDir;
    l.cellConcentration = cellCon;
    l.maxCellConcentration = maxCellCon;
    l.concentrationChange = cellConChange;
    l.dataDate = dataDate;
    l.changeDate = dataDate;
    l.sourceFrequency = 'Daily';
    l.source = source;
    l.validCellCount = 9;
    l.notes = [];
    l.marked = false;

    this.downloader.addUserLocation(this.user.getUserName(), l);
    this.locations.push(l);

    return l;
  }

  deleteLocation(ln: Location): void {
    const index = this.locations.map(loc => loc.id).indexOf(ln.id);
    if (index >= 0) {
      this.downloader.deleteUserLocation(this.user.getUserName(), ln.id);
      this.locations.splice(index, 1);
    }
    // delete from compare also
    this.deleteCompareLocation(ln);
  }

  // updateLocation(name: string, ln: Location): void {
  updateLocation(name: string, ln): void {
    this.locations.forEach((loc) => {
      if (loc.id === ln.id) {
        loc.name = name;
        let username = this.user.getUserName();
        this.downloader.editUserLocation(username, ln.id, name, ln.marked, JSON.stringify(ln.notes));
      }
    });
  }

  getCompareLocations(): Observable<Location[]> {
    return of(this.compare_locations);
  }

  addCompareLocation(ln: Location): void {
    if(this.compare_locations == undefined){
      this.compare_locations = [];
      this.compare_locations.push(ln);
    }
    else if(!this.compare_locations.includes(ln)){
      this.compare_locations.push(ln);
    }
    this.compareLocationsSource.next(this.compare_locations);  // updates Observable/Subject for subscribed components
  }

  updateCompareLocation(name: string, ln: Location) {
  }

  deleteCompareLocation(ln: Location): void {
    if (this.compare_locations.includes(ln)) {
      this.compare_locations.splice(this.compare_locations.indexOf(ln), 1);
      this.compareLocationsSource.next(this.compare_locations);
    }
  }

  convertCoordinates(latitude: number, longitude: number): Coordinate {
    let lat = Math.abs(latitude);
    let lng = Math.abs(longitude);

    let coordinate = new Coordinate();

    coordinate.latDeg = Math.trunc(lat);
    coordinate.lngDeg = Math.trunc(lng);

    coordinate.latMin = Math.trunc((lat - coordinate.latDeg) * 60) % 60;
    coordinate.lngMin = Math.trunc((lng - coordinate.lngDeg) * 60) % 60;

    coordinate.latSec = Math.trunc((lat - coordinate.latDeg - coordinate.latMin / 60) * 3600);
    coordinate.lngSec = Math.trunc((lng - coordinate.lngDeg - coordinate.lngMin / 60) * 3600);

    coordinate.latDir = latitude >= 0 ? 'N' : 'S';
    coordinate.lngDir = longitude >= 0 ? 'E' : 'W';

    return coordinate;
  }

  convertToDegrees(location: Location): Degree {
    let deg = new Degree();
    deg.latitude = location.latitude_deg + location.latitude_min / 60 + location.latitude_sec / 3600;
    deg.longitude = location.longitude_deg + location.longitude_min / 60 + location.longitude_sec / 3600;
    deg.latitude = location.latitude_dir == 'S' ? deg.latitude * -1 : deg.latitude;
    deg.longitude = location.longitude_dir == 'W' ? deg.longitude * -1 : deg.longitude;
    return deg;
  }

  getLastID(): number {
    let startID = 0;
    if (this.locations.length > 0) {
      let last = this.locations[0];
      this.locations.map(location => {
        if (location.id > last.id) {
          last = location;
        }
      });
      return last.id;
    } else {
      return startID;
    }
  }

  getPercentage(l: Location) {
    let cells = l.cellConcentration;
    let p = (cells / this.test_levels.veryhigh[0]) * 100;
    if (p > 100) {
      p = 100;
    }
    return this._sanitizer.bypassSecurityTrustStyle('conic-gradient(transparent ' + p.toString() + '%, #A6ACAF 0)');
  }

  getColor(l: Location, delta: boolean) {
    let cc = new ConcentrationRanges();
    let cells = l.cellConcentration;
    if (delta) {
      cells = Math.abs(l.concentrationChange);
    }
    let c = 'green';
    if (cells <= this.test_levels.low[0]) {
      c = 'green';
    } else if (cells > this.test_levels.low[0] && cells <= this.test_levels.low[1]) {
      c = 'green';
    } else if (cells > this.test_levels.medium[0] && cells <= this.test_levels.medium[1]) {
      c = 'yellow';
    } else if (cells > this.test_levels.high[0] && cells <= this.test_levels.high[1]) {
      c = 'orange';
    } else if (cells > this.test_levels.veryhigh[0]) {
      c = 'red';
    }
    return c;
  }

  getArrow(l: Location): boolean {
    if (l.concentrationChange > 0) {
      return true;
    }
    return false;
  }

  formatNumber(n: number): string {
    let _n = Math.abs(n);
    let s = _n.toLocaleString();
    return s;
  }

  setMarked(l: Location, m: boolean): void {
    l.marked = m;
    let username = this.user.getUserName();
    // let marked = (m) ? "true" : "false";
    this.downloader.editUserLocation(username, l.id, name, l.marked, JSON.stringify(l.notes));
  }

  addMarkers(map: Map): void {
    this.locations.forEach(location => {
      let self = this;
      if (!self.mapService.hasMarker(location.id)) {
        this.mapService.addMarker(location);
      }
    });
  }
}

class Coordinate {
  latDeg: number;
  latMin: number;
  latSec: number;
  latDir: string;
  lngDeg: number;
  lngMin: number;
  lngSec: number;
  lngDir: string;
}

class Degree {
  latitude: number;
  longitude: number;
}
