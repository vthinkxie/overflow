import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  ɵmarkDirty,
} from '@angular/core';
import { delay, map, tap } from 'rxjs/operators';
import { NzResizeObserver } from './resize-observer';

@Directive({
  selector: '[appOverflowItem]',
  host: {
    '[style]': 'overflowStyle',
  },
})
export class OverflowItemDirective {
  overflowStyle: { [key: string]: string | number | undefined } | undefined =
    undefined;
  itemWidth$ = this.nzResizeObserver
    .observe(this.elementRef.nativeElement)
    .pipe(
      map(([item]) => item.target.clientWidth),
      tap((width) => (this.itemWidth = width))
    );
  itemWidth: number | undefined = undefined;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setItemStyle(
    responsive: boolean,
    display: boolean,
    invalidate: boolean,
    order: number
  ): void {
    const mergedHidden = responsive && !display;
    if (!invalidate) {
      this.overflowStyle = {
        opacity: mergedHidden ? 0 : 1,
        height: mergedHidden ? 0 : undefined,
        overflowY: mergedHidden ? 'hidden' : undefined,
        order: responsive ? order : undefined,
        pointerEvents: mergedHidden ? 'none' : undefined,
        position: mergedHidden ? 'absolute' : undefined,
      };
    } else {
      this.overflowStyle = undefined;
    }
    this.cdr.detectChanges();
    // ɵmarkDirty(this);
  }
}
