import { Injectable } from '@angular/core';
import { Map, LatLng, Marker, LayerGroup, icon, Layer, marker, tileLayer } from 'leaflet';
import { Location } from '../models/location';
import { CyanMap } from '../utils/cyan-map';
import { UserService } from '../services/user.service';
import { ConcentrationRanges } from '../test-data/test-levels';
import { MapPopupComponent } from '../map-popup/map-popup.component';
import { NgElement, WithProperties } from '@angular/elements';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  cyan_ranges: ConcentrationRanges;

  marker_list = {};
  mini_marker_list = {};

  private data_source = 'OLCI';

  public mainTileLayer: string = '';

  degSecRounding: number = 6;  // rounding for dms seconds

  constructor(private cyanMap: CyanMap, private userService: UserService) {}

  setMap(map: Map): void {
    this.cyanMap.map = map;
    this.cyanMap.markers = new LayerGroup();
    this.cyanMap.markers.addTo(this.cyanMap.map);
    map.zoomControl.setPosition('bottomright');
  }

  setMinimap(map: Map, mk: Marker): void {
    this.cyanMap.miniMap = map;
    this.setMiniMarker(mk);
    map.zoomControl.setPosition('bottomright');
  }

  setMiniMarker(mk: Marker): void {
    if (mk != undefined) {
      // Removes any existing marker from minimap:
      // if (this.cyanMap.miniMarker != undefined && this.cyanMap.miniMap.hasLayer(this.cyanMap.miniMarker)) {
      //   this.cyanMap.miniMap.removeLayer(this.cyanMap.miniMarker);
      // }
      this.cyanMap.miniMarker = mk;
      this.cyanMap.miniMap.addLayer(mk);
    }
  }

  setMiniMarkerForCompare(mk: Marker): void {
    if (mk != undefined) {
      this.cyanMap.miniMarker = mk;
      this.cyanMap.miniMap.addLayer(mk);
    }
  }

  getMap(): Map {
    return this.cyanMap.map;
  }

  getMinimap(): Map {
    return this.cyanMap.miniMap;
  }

  getMarkers(): LayerGroup {
    return this.cyanMap.markers;
  }

  hasMarker(id: number): boolean {
    if (id in this.marker_list) {
      return true;
    } else {
      return false;
    }
  }

  createMarker(location: Location, useBlank: boolean = false): Marker {
    /*
    Creates leaflet marker for map.
    */

    let markerLocation = useBlank ? null : location

    let m = marker(this.getLatLng(location), {
      icon: this.createIcon(markerLocation),
      alt: "Map marker for " + location.name,
      riseOnHover: true,
      zIndexOffset: 10000
    });

    return m;
  }

  createIcon(location: Location, markerType: string = null) {
    /*
    Creates icon for map marker.
    */
    return icon({
      iconSize: [30, 36],
      iconAnchor: [13, 41],
      iconUrl: this.getMarker(location, markerType),
      shadowUrl: 'leaflet/marker-shadow.png'
    });
  }

  addMarker(ln: Location, isMiniMap: boolean = false): Marker {

    let map = this.getMap();
    let m = this.createMarker(ln);

    let self = this;
    m.on('click', function(e) {
      let p = self.createPopup(ln);
      map.setView(m.getLatLng(), 12);
      m.bindPopup(p, {
        className: 'customClass'
      }).openPopup();
      m.unbindPopup();
    });
    m.bindTooltip(ln.name);
    m.on('mouseover', function(e) {
      m.openTooltip(m.getLatLng());
    });

    this.cyanMap.markers.addLayer(m);
    this.marker_list[ln.id] = m;

    return m;
  }

  addMiniMarker(ln: Location): Marker {
    /*
    Adds marker to mini map.
    */
    let marker = this.createMarker(ln, true);
    this.setMinimap(this.cyanMap.miniMap, marker);
    this.mini_marker_list[ln.id] = marker;
    return marker;
  }

  updateMarker(ln: Location): void {
    let _icon = this.createIcon(ln);
    let marker = this.marker_list[ln.id];
    if (marker) {
      marker.setTooltipContent(ln.name + '<br>' + ln.dataDate);
      marker.setIcon(_icon);
    }
  }

  deleteMarker(ln: Location): void {

    let marker = this.marker_list[ln.id];
    this.cyanMap.markers.removeLayer(marker);
    delete this.marker_list[ln.id];

    this.cyanMap.map.closePopup();
  }

  deleteMiniMarker(ln: Location): void {
    /*
    Removes marker from mini map.
    */
    let miniMarker = this.mini_marker_list[ln.id];
    this.cyanMap.miniMap.removeLayer(miniMarker);
    delete this.mini_marker_list[ln.id];
    this.cyanMap.miniMap.closePopup();
  }

  getSource(): string {
    return this.data_source;
  }

  changeSource(src: string): void {
    this.data_source = src === 'MERIS' ? 'MERIS' : 'OLCI';
  }

  getLatLng(ln: Location): LatLng {
    return this.cyanMap.getLocationLatLng(ln);
  }

  createPopup(ln: Location): any {
    const popup: NgElement & WithProperties<MapPopupComponent> = document.createElement('popup-element') as any;
    popup.location = ln;
    return popup;
  }

  getMarker(ln: Location = null, markerType: string = null): string {
    /*
    Gets marker image URL for location based on
    cell concentration and mark(ed).
    */

    if (ln === null && markerType == 'remove') {
      return 'assets/images/map_pin_blank_remove.png';
    }
    else if (ln == null) {
      return 'assets/images/map_pin_blank.png'; 
    }

    let n = ln.cellConcentration;
    let c = ln.marked;
    let userSettings = this.userService.getUserSettings();

    if (n <= userSettings.level_low) {
      if (c) {
        return 'assets/images/map_pin_green_checked.png';
      } else {
        return 'assets/images/map_pin_green_unchecked.png';
      }
    } else if (n <= userSettings.level_medium && n > userSettings.level_low) {
      if (c) {
        return 'assets/images/map_pin_yellow_checked.png';
      } else {
        return 'assets/images/map_pin_yellow_unchecked.png';
      }
    } else if (n <= userSettings.level_high && n > userSettings.level_medium) {
      if (c) {
        return 'assets/images/map_pin_orange_checked.png';
      } else {
        return 'assets/images/map_pin_orange_unchecked.png';
      }
    } else if (n >  userSettings.level_high) {
      if (c) {
        return 'assets/images/map_pin_red_checked.png';
      } else {
        return 'assets/images/map_pin_red_unchecked.png';
      }
    } else {
      if (c) {
        return 'assets/images/map_pin_green_checked.png';
      } else {
        return 'assets/images/map_pin_green_unchecked.png';
      }
    }
  }

  convertDmsToDd(latDeg: number, latMin: number, latSec: number, latDir: string, lonDeg: number, lonMin: number, lonSec: number, lonDir: string) {
    /*
    Converts lat/lon from DMS to decimal degrees.
    */
    let lat = latDeg + (latMin / 60.0) + (latSec / 3600.0);
    let lon = lonDeg + (lonMin / 60.0) + (lonSec / 3600.0);
    lat = latDir == "S" ? lat * -1 : lat;
    lon = lonDir == "W" ? lon * -1 : lon;
    return [lat, lon];
  }

  convertDdToDms(lat: number, lon: number) {
    let dmsCoords = [];
    [lat, lon].forEach(coord => {
      coord = Math.abs(coord);
      let coordDeg = Math.trunc(coord);
      let coordMin = 60.0 * (coord - coordDeg);
      let coordSec = 60.0 * (coordMin - Math.trunc(coordMin));
      dmsCoords.push([coordDeg, Math.round(coordMin), +coordSec.toFixed(this.degSecRounding)]);
    });
    return dmsCoords;
  }

}
