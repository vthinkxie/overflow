import { ChangeDetectorRef, Directive, ElementRef } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { NzResizeObserver } from './resize-observer';

@Directive({
  selector: '[appOverflowSuffix]',
  host: {
    '[style]': 'suffixStyle',
  },
})
export class OverflowSuffixDirective {
  suffixStyle = {};
  suffixWidth$ = this.nzResizeObserver
    .observe(this.elementRef.nativeElement)
    .pipe(
      map(([item]) => (item.target as HTMLElement).offsetWidth),
      tap((width) => (this.suffixWidth = width))
    );
  suffixWidth = 0;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setSuffixStyle(start: number | null, order: number): void {
    if (start !== null) {
      this.suffixStyle = {
        position: 'absolute',
        left: `${start}px`,
        top: 0,
        opacity: 1,
        order: order,
      };
    } else {
      this.suffixStyle = {
        opacity: 1,
        order: order,
      };
    }
    this.cdr.detectChanges();
  }
}
