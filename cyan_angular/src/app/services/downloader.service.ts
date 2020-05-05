import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subscription, BehaviorSubject } from 'rxjs';
import { ajax } from 'rxjs/ajax';

import { Location } from '../models/location';
import { environment } from '../../environments/environment';
import {LocationType} from "../models/location";
import { AuthService } from '../services/auth.service';
import {UserSettings} from "../models/settings";

class UrlInfo {
  type: string;
  url: string;
}

class MetaInfo {
  locationName: string;
  locationLat: number;
  locationLng: number;
  description: string;
  status: string;
  requestTimestampLong: number;
  requestTimestamp: string;
  queryDateLong: number;
  queryDate: string;
  url: UrlInfo;
}

class DataPoint {
  imageDateLong: number;
  imageDate: string;
  satelliteImageType: string;
  satelliteImageFrequency: string;
  cellConcentration: number;
  maxCellConcentration: number;
  latitude: number;
  longitude: number;
  validCellsCount: number;
}

export interface LocationDataAll {
  metaInfo: MetaInfo;
  outputs: DataPoint[];
}

export class RawData {
  requestData: LocationDataAll = null;
  location: Location = null;
}

const headerOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})
export class DownloaderService {
  private baseUrl: string = 'https://cyan.epa.gov/';
  private dataUrl: string = 'cyan/cyano/location/data/'; //  complete url is baseUrl + dataUrl + LAT + "/" + LNG + "/all"

  private baseServerUrl: string = environment.baseServerUrl;  // see src/environments for this value

  private locationSubject =  new BehaviorSubject<Location>(null);
  locationsChanged = this.locationSubject.asObservable();

  locationsData: any = {};
  locations: Location[] = [];


  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  registerUser(username: string, email: string, password: string) {
    let url = this.baseServerUrl + 'user/register';
    let body = { user: username, email: email, password: password };
    return this.http.post(url, body, headerOptions);
  }

  userLogin(username: string, password: string) {
    let url = this.baseServerUrl + 'user';
    let body = { user: username, password: password, dataType: LocationType.OLCI_WEEKLY };
    return this.http.post(url, body, headerOptions);
  }

  addUserLocation(username: string, ln: Location) {
    let url = this.baseServerUrl + 'location/add';
    let body = {
      owner: username,
      id: ln.id,
      name: ln.name,
      type: ln.type,
      latitude: ln.latitude,
      longitude: ln.longitude,
      marked: ln.marked,
      compare: ln.compare,
      notes: ln.notes
    };
    this.executeAuthorizedPostRequest(url, body).subscribe();
  }

  updateUserLocation(username: string, ln: Location) {
    let url = this.baseServerUrl + 'location/edit';
    let body = {
      owner: username,
      id: ln.id,
      type: ln.type,
      name: ln.name,
      marked: ln.marked,
      compare: ln.compare,
      notes: ln.notes
    };
    this.executeAuthorizedPostRequest(url, body).subscribe();
  }

  deleteUserLocation(username: string, id: number, type: number) {
    delete this.locationsData[id];
    let url = this.baseServerUrl + 'location/delete/' + id + '/' + type;
    this.executeDeleteUserLocation(url).subscribe();
  }

  executeDeleteUserLocation(url: string) {
    return this.executeAuthorizedGetRequest(url);
  }

  getUserLocation(username: string, id: number) {
    let url = this.baseServerUrl + 'location/' + id;
    return this.executeAuthorizedGetRequest(url);
  }

  getUserLocations(username: string, type: number) {
    let url = this.baseServerUrl + 'locations/' + type;
    return this.executeAuthorizedGetRequest(url);
  }

  updateNotification(username: string, id: number) {
    /*
     Updates user's notification, e.g., is_new set to false if clicked.
    */
    let url = this.baseServerUrl + 'notification/edit/' + id;
    return this.executeUpdateNotification(url).subscribe();
  }

  executeUpdateNotification(url: string) {
    return this.executeAuthorizedGetRequest(url);
  }

  clearUserNotifications(username: string) {
    /*
    Clears all user's notifications.
    */
    let url = this.baseServerUrl + 'notification/delete';
    this.executeClearUserNotifications(url).subscribe();
  }

  executeClearUserNotifications(url: string) {
    return this.executeAuthorizedGetRequest(url);
  }

  updateUserSettings(settings: UserSettings) {
    /*
     Updates user's settings for color configuration/alert threshold.
     */
    let url = this.baseServerUrl + 'settings/edit';
    return this.executeAuthorizedPostRequest(url, settings);
  }

  executeAuthorizedPostRequest(url: string, body: any) {
    if (!this.authService.checkUserAuthentication()) { return; }
    return this.http.post(url, body, headerOptions);
  }

  executeAuthorizedGetRequest(url: string) {
    if (!this.authService.checkUserAuthentication()) { return; }
    return this.http.get(url);
  }

  ajaxRequest(ln: Location, username: string, url: string) {
    let self = this;
    ajax(url).subscribe(data => {
      let d: LocationDataAll = data.response;
      let loc = self.createLocation(ln, username, d);
      let index = this.getLocationIndex(loc);
      // if index not found, location has been deleted by user
      if (index > -1) {
        self.locations[index] = loc;
        self.locationsData[ln.id] = {
          requestData: d,
          location: loc
        };

        // raise event location changed
        self.locationSubject.next(loc);
      }
    });
  }

  getAjaxData(username: string, ln: Location) {

    // Checks if token is valid before making requests:
    if (!this.authService.checkUserAuthentication()) { return; }

    let hasData: boolean = this.locationsData.hasOwnProperty(ln.id);
    if (!hasData) {
      let url = this.baseUrl + this.dataUrl + ln.latitude.toString() + '/' + ln.longitude.toString() + '/all';
      switch (ln.type) {
        case LocationType.OLCI_WEEKLY:
              url += '?type=olci&frequency=weekly';
              break;
        case LocationType.OLCI_DAILY:
              url += '?type=olci&frequency=daily';
              break;
      }
      this.ajaxRequest(ln, username, url);
    }
  }

  getLocationIndex(ln: Location) {
    return this.locations.findIndex(loc => loc.id == ln.id && loc.type == ln.type);
  }

  locationNotDeleted(ln: Location) {
    return this.getLocationIndex(ln) >= 0;
  }

  getData(): Observable<Location[]> {
    return of(this.locations);
  }

  getTimeSeries(): Observable<RawData[]> {
    return of(this.locationsData);
  }

  createLocation(loc: Location, username: string, data: LocationDataAll): Location {

    let coordinates = this.convertCoordinates(data.metaInfo.locationLat, data.metaInfo.locationLng);
    let name = loc.name;

    let ln = new Location();
    ln.id = loc.id;
    if (name != null && name.indexOf('Update') == -1) {
      ln.name = name;
    } else {
      ln.name = data.metaInfo.locationName;
    }
    ln.type = loc.type;

    ln.latitude_deg = coordinates.latDeg;
    ln.latitude_min = coordinates.latMin;
    ln.latitude_sec = coordinates.latSec;
    ln.latitude_dir = coordinates.latDir;
    ln.longitude_deg = coordinates.lngDeg;
    ln.longitude_min = coordinates.lngMin;
    ln.longitude_sec = coordinates.lngSec;
    ln.longitude_dir = coordinates.lngDir;

    if (data.outputs.length > 0) {
      ln.cellConcentration = Math.round(data.outputs[0].cellConcentration);
      ln.maxCellConcentration = Math.round(data.outputs[0].maxCellConcentration);
      ln.dataDate = data.outputs[0].imageDate.split(' ')[0];
      ln.source = data.outputs[0].satelliteImageType;
      ln.sourceFrequency = data.outputs[0].satelliteImageFrequency;
      ln.validCellCount = data.outputs[0].validCellsCount;

      if (data.outputs.length > 1) {
        ln.concentrationChange = Math.round(data.outputs[0].cellConcentration - data.outputs[1].cellConcentration);
        ln.changeDate = data.outputs[1].imageDate.split(' ')[0];
      } else {
        ln.concentrationChange = 0.0;
        ln.changeDate = '';
      }
    } else {
      ln.cellConcentration = 0.0;
      ln.maxCellConcentration = 0.0;
      ln.concentrationChange = 0.0;
      ln.dataDate = '';
      ln.changeDate = '';
      ln.source = '';
      ln.sourceFrequency = '';
      ln.validCellCount = 0;
    }
    // ln.notes = [];
    ln.notes = loc.notes;
    if (loc.marked != null) {
      ln.marked = loc.marked;
    } else {
      ln.marked = false;
    }
    ln.compare = loc.compare;

    // update only if name changed and user did not remove location before API returns
    if (ln.name != loc.name && this.locationNotDeleted(ln)) {
      ln.name = this.addUniqueId(ln);
      this.updateUserLocation(username, ln);
    }
    return ln;

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

  addUniqueId(ln: Location): string {
    /*
    Creates a unique ID for location name.
    */
    let matchedLocations: Number[] = [];
    this.locations.forEach((location) => {
      if (location.name.includes(ln.name)) {
        let idNum = location.name.split(" -- ")[1];
        if (idNum != undefined && !isNaN(Number(idNum)) && !isNaN(parseInt(idNum))) {
          matchedLocations.push(Number(idNum));
        }
      }
    });
    if (matchedLocations.length == 0) {
      ln.name = ln.name + " -- 1";  
    }
    else if (matchedLocations.length > 0) {
      ln.name = ln.name + " -- " + (Math.max.apply(null, matchedLocations) + 1).toString();  
    }
    else {
      ln.name = ln.name;
    }
    return ln.name;
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
