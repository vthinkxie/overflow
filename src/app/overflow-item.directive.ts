import { ChangeDetectorRef, Directive, ElementRef } from '@angular/core';
import { distinctUntilChanged, map, startWith, tap } from 'rxjs/operators';
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
      map(([item]) => (item.target as HTMLElement).offsetWidth),
      distinctUntilChanged(),
      startWith(undefined),
      tap((width) => {
        this.itemWidth = width;
      })
    );
  itemWidth: number | undefined = undefined;
  constructor(
    private nzResizeObserver: NzResizeObserver,
    public elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  setItemStyle(display: boolean, order: number): void {
    const mergedHidden = !display;
    this.overflowStyle = {
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
