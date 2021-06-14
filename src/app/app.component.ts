import { ChangeDetectorRef, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  count = 3;
  list = new Array(this.count).fill(0);
  width = 0;
  text = '';

  constructor(private cdr: ChangeDetectorRef) {}

  generateList(e: Event): void {
    const count = (e.target as HTMLSelectElement).value;
    this.list = new Array(+count).fill(0);
  }
  updateInputWidth(measure: HTMLElement, target: HTMLInputElement): void {
    this.text = target.value;
    this.cdr.detectChanges();
    this.width = measure.offsetWidth;
    this.cdr.detectChanges();
  }
}
