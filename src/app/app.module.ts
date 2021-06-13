import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { OverflowItemDirective } from './overflow-item.directive';
import { OverflowContainerComponent } from './overflow-container.component';
import { NzResizeObserverModule } from './resize-observer';
import { OverflowSuffixDirective } from './overflow-suffix.directive';
import { OverflowRestDirective } from './overflow-rest.directive';

@NgModule({
  declarations: [
    AppComponent,
    OverflowItemDirective,
    OverflowContainerComponent,
    OverflowSuffixDirective,
    OverflowRestDirective,
  ],
  imports: [BrowserModule, NzResizeObserverModule],
  providers: [],

  bootstrap: [AppComponent],
})
export class AppModule {}
