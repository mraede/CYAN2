import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { latLng, latLngBounds, tileLayer, marker, icon, Map, Layer, Marker, ImageOverlay, LayerGroup } from 'leaflet';
import { Subscription } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';

import { MapService } from '../services/map.service';
import { Location } from '../models/location';
import { LocationService } from '../services/location.service';
import { LocationImagesService } from '../services/location-images.service';
import { ImageDetails } from '../models/image-details';
import { DownloaderService, RawData } from '../services/downloader.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-location-compare-details',
  templateUrl: './location-compare-details.component.html',
  styleUrls: ['./location-compare-details.component.css']
})
export class LocationCompareDetailsComponent implements OnInit {

  imageCollection: ImageDetails[];
  locationThumbs: ImageDetails[];
  locationTIFFs: ImageDetails[];
  locationPNGs: ImageDetails[];

  filteredPNGs: ImageDetails[];

  lat_0: number = 33.927945;
  lng_0: number = -83.346554;

  current_location: Location;
  current_location_index: number;
  locations: Location[];
  imageSub: Subscription;
  loading: boolean = false;

  layer: ImageOverlay;
  selectedLayer: ImageDetails;
  selectedLayerIndex: number;
  slidershow: boolean = false;
  showSliderValue: boolean = true;

  minDate: Date = new Date();
  maxDate: Date = new Date();
  startDate: Date = new Date();
  endDate: Date = new Date();

  loadTicker = 1;
  opacityValue = 0.7;

  showMap = false;

  // Variables for chart
  @ViewChild('cyanChart') cyanChart: BaseChartDirective;
  dataDownloaded: boolean = false;
  @Input() chartData: Array<any> = [];
  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'month',  // default: MMM YYYY
          parser: "MM-DD-YYYY",
          displayFormats: {
            month: 'MM-YYYY'
          }
        }
      }]
    },
    plugins: {
      zoom: {
        zoom: {
          enabled: true,
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'xy'
        },
        pan: {
          enabled: true,
          mode: 'xy'
        }
      },
      datalabels: {
        display: false
      }
    }
  };
  public chartColors: Array<any> = [
    {
      // cyan
      backgroundColor: 'rgba(0,255,255,0.2)',
      borderColor: 'rgba(0,255,255,1)',
      pointBackgroundColor: 'rgba(0,255,255,1)',
      pointBorderColor: '#00FFFF',
      pointHoverBackgroundColor: '#00FFFF',
      pointHoverBorderColor: 'rgba(0,255,255,0.8)',
    }
  ];
  public chartLegend: boolean = true;
  public chartType: string = 'line';

  chartHover(event: any): void {
    console.log(event);
  }

  tsSub: Subscription;
  tsTicker = 1;

  topoMap = tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    detectRetina: true,
    attribution: 'Tiles &copy; Esri'
  });

  esriImagery = tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    detectRetina: true,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });
  streetMaps = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    detectRetina: true,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  layersControl = {
    baseLayers: {
      'Imagery Maps': this.esriImagery,
      'Street Maps': this.streetMaps,
      'Topographic Maps': this.topoMap
    }
  };

  tileLayer: string = this.mapService.mainTileLayer;  // uses same tileLayer as main map
  mapLayer = this.layersControl.baseLayers[this.tileLayer];

  options = {
    layers: [this.mapLayer],
    zoomControl: true,
    zoom: 6,
    center: latLng([this.lat_0, this.lng_0])
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    private mapService: MapService,
    private bottomSheet: MatBottomSheet,
    private images: LocationImagesService,
    private downloader: DownloaderService,
    private user: UserService,
    private authService: AuthService,
    private configService: ConfigService
  ) { }

  ngOnInit() {

    if (!this.authService.checkUserAuthentication()) { return; }

    this.imageCollection = null;
    this.route.params.subscribe(
      params =>
        (this.locations =
          params['locations'] != undefined
            ? params['locations'].split(',').map(id => this.locationService.getLocationByID(id))
            : this.locationService.getStaticLocations())
    );
    this.route.params.subscribe(
      params =>
        (this.current_location =
          params['location'] != undefined ? this.locationService.getLocationByID(params['location']) : this.locations[0])
    );
    if (this.locations != undefined && this.current_location != undefined) {
      this.current_location_index =
        this.locations.indexOf(this.current_location) > 0 ? this.locations.indexOf(this.current_location) + 1 : 1;
    } else {
      this.current_location_index = 1;
    }

    // Gets time series data and plots it for each location:
    this.locations.forEach(location => {
      this.downloadTimeSeries(location);
    });

    let self = this;
    let timeout = this.tsTicker * 1000;
    setTimeout(function() {
      self.tsSub.unsubscribe();
      if (!self.dataDownloaded) {
        self.downloadTimeSeries(this.current_location);
      } else {
        self.tsTicker = 1;
      }
    }, timeout);
  }

  exit() {
    
  }

  downloadTimeSeries(l: Location) {
    let coord = this.locationService.convertToDegrees(l);
    this.locationService.downloadLocation(l);
    this.tsSub = this.downloader.getTimeSeries().subscribe((rawData: RawData[]) => {
      let data = rawData[l.id].requestData;
      let timeSeriesData = [];
      data.outputs.map(timestep => {
        // Builds data var like [{x: '', y: ''}, {}...]
        let datum = {
          x: timestep.imageDate.split(' ')[0],
          y: timestep.cellConcentration
        };
        timeSeriesData.push(datum);
      });

      // Adds time series line to chart:
      this.chartData.push({
        data: timeSeriesData,
        label: l.name,
        lineTension: 0
      });

      this.dataDownloaded = true;
    });
  }

  displayMap($event): void {
    if ($event.index == 2) {
      this.showMap = true;
    }
  }

  onMapReady(map: Map): void {
    if (!this.authService.checkUserAuthentication()) { return; }
    let markerArray = [];
    let latLngArray = [];
    map.invalidateSize();  // will this fix the gray map?
    this.mapService.setMinimap(map, null);
    this.locations.forEach(loc => {
      let marker = this.mapService.createMarker(loc);
      this.mapService.setMiniMarkerForCompare(marker);
      latLngArray.push(this.mapService.getLatLng(loc));
    });
    setTimeout(() => {
      map.invalidateSize();
      map.flyToBounds(latLngArray);
    }, 200);
  }

  getArrow(l: Location) {
    return this.locationService.getArrow(l);
  }

  getColor(l: Location, delta: boolean) {
    let color = this.locationService.getColor(l, delta);  // gets color based on user's settings
    return this.configService.getColorRgbValue(color);
  }

  formatNumber(n: number) {
    return this.locationService.formatNumber(n);
  }

  getPercentage(l: Location) {
    return this.locationService.getPercentage(l);
  }

  getPercentage2(l: Location) {
    return this.locationService.getPercentage2(l);
  }

  getArrowColor(l: Location, delta: boolean) {
    return this.locationService.getColor(l, delta);
  }

  resetZoom() {
    this.cyanChart.chart['resetZoom']();
  }

}
