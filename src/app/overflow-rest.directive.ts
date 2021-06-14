import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  ɵmarkDirty,
} from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { NzResizeObserver } from './resize-observer';

@Directive({
  selector: '[appOverflowRest]',
  host: {
    '[style]': 'restStyle',
  },
})
export class OverflowRestDirective {
  restStyle: { [key: string]: string | number | undefined } | undefined =
    undefined;
  restWidth$ = this.nzResizeObserver
    .observe(this.elementRef.nativeElement)
    .pipe(
      map(([item]) => (item.target as HTMLElement).offsetWidth),
      tap((width) => (this.restWidth = width))
    );
  restWidth = 0;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setRestStyle(display: boolean, order: number): void {
    const mergedHidden = !display;
    this.restStyle = {
      opacity: mergedHidden ? 0 : 1,
      height: mergedHidden ? 0 : undefined,
      overflowY: mergedHidden ? 'hidden' : undefined,
      order: order,
      pointerEvents: mergedHidden ? 'none' : undefined,
      position: mergedHidden ? 'absolute' : undefined,
    };
    this.cdr.detectChanges();
  }
}
