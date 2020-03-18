import { Component, OnInit, NgModule } from '@angular/core';
import { LocationService } from '../services/location.service';
import { UserService } from '../services/user.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
	selector: 'app-header',
	templateUrl: './header.component.html',
	styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

	title = "Cyanobacteria Assessment Network";
	titleAbr = "CyAN";
	compare_locations = [];
	locationSubscription: Subscription;
	new_notifications = [];
	notificationSubscription: Subscription;

	constructor(
		private userService: UserService,
		private locationService: LocationService,
		private router: Router
	) { }

	ngOnInit() {

		this.notificationSubscription = this.userService.allNotifications$.subscribe(
			notifications => {
				// Only using new (ie, unread, is_new=true) notifications.
				this.new_notifications = notifications.filter(x => x[5] === 1);
			}
		);

		this.locationSubscription = this.locationService.compare$.subscribe(
			locations => {
				this.compare_locations = locations
			}
		);

	}

	ngOnDestroy() {
		this.notificationSubscription.unsubscribe();
		this.locationSubscription.unsubscribe();
	}

	displayLogout() {
		// Navigates to /account for user to log out.
		this.router.navigate(['/account', {loggingOut: true}]);
	}

}
