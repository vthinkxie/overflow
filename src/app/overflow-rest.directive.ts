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
      map(([item]) => item.target.clientWidth),
      tap((width) => (this.restWidth = width))
    );
  restWidth = 0;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setRestStyle(
    responsive: boolean,
    display: boolean,
    invalidate: boolean,
    order: number
  ): void {
    const mergedHidden = responsive && !display;
    if (!invalidate) {
      this.restStyle = {
        opacity: mergedHidden ? 0 : 1,
        height: mergedHidden ? 0 : undefined,
        overflowY: mergedHidden ? 'hidden' : undefined,
        order: responsive ? order : undefined,
        pointerEvents: mergedHidden ? 'none' : undefined,
        position: mergedHidden ? 'absolute' : undefined,
      };
    } else {
      this.restStyle = undefined;
    }
    this.cdr.detectChanges();
    // ɵmarkDirty(this);
  }
}
