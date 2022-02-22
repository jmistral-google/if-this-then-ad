/**
    Copyright 2022 Google LLC
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        https://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})

/**
 * Header component.
 */
export class HeaderComponent implements OnInit {
  avatarUrl: string = '';

  /**
   * Constructor.
   *
   * @param {AuthService} authService
   * @param {Router} router
   */
  constructor(public authService: AuthService, private router: Router) {
    // Get user's profile picture
    this.authService.userWatch.subscribe((user) => {
      this.avatarUrl = user ? user.profilePhoto : '';
    });
  }

  // eslint-disable-next-line require-jsdoc
  ngOnInit(): void {}

  /**
   * Logout - Navigate to Login page.
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}