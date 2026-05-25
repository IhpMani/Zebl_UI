import { Component, HostListener } from '@angular/core';
import { BroadbillKeyboardService } from '../services/broadbill-keyboard.service';

@Component({
  selector: 'app-broadbill-keyboard-host',
  template: ''
})
export class BroadbillKeyboardHostComponent {
  constructor(private readonly keyboard: BroadbillKeyboardService) {}

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    this.keyboard.handleKeydown(event);
  }
}
