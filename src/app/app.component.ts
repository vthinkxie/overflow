import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  count = 10;
  list = new Array(this.count).fill(0);
  generateList(e: Event): void {
    const count = (e.target as HTMLSelectElement).value;
    this.list = new Array(+count).fill(0);
  }
}
