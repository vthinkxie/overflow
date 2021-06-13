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
      map(([item]) => item.target.clientWidth),
      tap((width) => (this.suffixWidth = width))
    );
  suffixWidth = 0;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setSuffixStyle(style: { [key: string]: string | number | undefined }) {
    this.suffixStyle = style;
    this.cdr.markForCheck();
  }
}
