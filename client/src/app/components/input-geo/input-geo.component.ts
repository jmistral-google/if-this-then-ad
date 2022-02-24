import { 
  Component, OnInit, Input, Output, EventEmitter, HostBinding,
  Optional, Self, ViewChild, ElementRef
} from '@angular/core';
import { FormGroup, NgControl, FormBuilder } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from "rxjs";
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { config } from './config';
import { get as getScript } from 'scriptjs';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
declare const google: any;

@Component({
  selector: 'app-input-geo',
  templateUrl: './input-geo.component.html',
  styleUrls: ['./input-geo.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: InputGeoComponent}]
})
export class InputGeoComponent implements OnInit, MatFormFieldControl<string> {
  @Input() dataPoint: string|undefined;
  @Input() value: string;
  @ViewChild('geoInput') geoInput: ElementRef;

  targetLocationValue: string|number|undefined = '';
  @Output() targetLocationChange = new EventEmitter<string>();

  geoForm: FormGroup;

  // START: Implementing the MatFormFieldControl interface
  controlType = 'input-geo';

  static nextId = 0;
  @HostBinding() id = `${this.controlType}-${InputGeoComponent.nextId++}`;
  stateChanges = new Subject<void>();

  private _placeholder: string;
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  focused = false;
  touched = false;
  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    this.touched = true;
    this.focused = false;
    this.stateChanges.next();
  }

  get empty() {
    return !this.geoInput?.nativeElement.value;
  }

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  private _required = false;
  @Input()
  get required() {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  private _disabled = false;
  @Input()
  get disabled(): boolean { 
    return this._disabled; 
  }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return !this.geoInput?.nativeElement.value && this.touched;
  }

  setDescribedByIds(ids: string[]) {}

  onContainerClick(event: MouseEvent) {}
  // END: Implementing the MatFormFieldControl interface

  constructor(
    fb: FormBuilder, 
    @Optional() @Self() public ngControl: NgControl,
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.geoForm = fb.group({
      'targetLocation': '',
    });
  }

  ngOnInit(): void {
  }

  @Input()
  get targetLocation() {
    return this.targetLocationValue;
  }

  set targetLocation(value) {
    this.targetLocationValue = value;
    this.targetLocationChange.emit(this.targetLocationValue as string);
    this.stateChanges.next();
  }

  ngAfterViewInit(): void {
    this.initGeoSearch();
  }

  private async initGeoSearch() {
    const url = config.apiUrl + this.getApiKey('GOOGLE_MAPS_API_KEY');
    getScript(url, () => {
      this.setGeoListener();
    });
  }

  private setGeoListener() {
      const currentInput = this.geoInput.nativeElement;
      const autocomplete = new google.maps.places.Autocomplete(currentInput);

      autocomplete.setFields([
        "address_components",
        "name"
      ]);

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const currentAddress = this.getFormatedAddress(place);

        currentInput.value = currentAddress;
        this.targetLocation = currentAddress;
      });
  }

  private getFormatedAddress(place: any): string {
    let locality = '';
    let country = '';
    for (const component of place.address_components) {
      switch (component.types[0]) {
        case 'locality':
          locality = component.long_name;
          break;

        case 'country':
          country = component.long_name;
          break;
      }
    }

    return (locality ? `${locality}, `: '') + country;
  }

  private isIterable(a: any) {
    return a != null && Symbol.iterator in Object(a);
  }

  private getApiKey(name: string) {
    const settings = (this.authService as any)?.currentUser.settings;
    if (this.isIterable(settings)) {
      for (const s in settings) {
        const param = settings[s]?.params;
        if (this.isIterable(param)) {
          for (const p in param) {
            if (('key' in (param[p] as Object)) && name == param[p].key ) {
              return param[p].value;
            }
          }
        }
      }
    }

    return '';
  }
}
