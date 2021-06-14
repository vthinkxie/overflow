import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  ContentChildren,
  QueryList,
  ElementRef,
  OnInit,
  SimpleChanges,
  AfterContentInit,
  OnDestroy,
  ContentChild,
  ChangeDetectorRef,
} from '@angular/core';
import { OverflowItemDirective } from './overflow-item.directive';
import { NzResizeObserver } from './resize-observer';
import {
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  takeUntil,
  takeWhile,
  withLatestFrom,
} from 'rxjs/operators';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  ReplaySubject,
  Subject,
} from 'rxjs';
import { OverflowSuffixDirective } from './overflow-suffix.directive';
import { OverflowRestDirective } from './overflow-rest.directive';

@Component({
  selector: 'app-overflow-container',
  template: ` <ng-content></ng-content>
    <ng-content select="[appOverflowRest]"></ng-content>
    <ng-content select="[appOverflowSuffix]"></ng-content>`,
  providers: [NzResizeObserver],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverflowContainerComponent
  implements OnInit, AfterContentInit, OnDestroy
{
  contentInit$ = new Subject<void>();
  @ContentChildren(OverflowItemDirective)
  overflowItems: QueryList<OverflowItemDirective> | undefined = undefined;
  @ContentChild(OverflowSuffixDirective)
  overflowSuffix: OverflowSuffixDirective | undefined = undefined;
  @ContentChild(OverflowRestDirective) overflowRest:
    | OverflowRestDirective
    | undefined = undefined;
  overflowItems$ = new ReplaySubject<QueryList<OverflowItemDirective>>(1);
  destroy$ = new Subject<void>();
  containerWidth$ = this.nzResizeObserver
    .observe(this.elementRef.nativeElement)
    .pipe(map(([item]) => item.target.clientWidth || 0));
  restWidth$ = new BehaviorSubject<number>(0);
  suffixWidth$ = new BehaviorSubject<number>(0);
  suffixFixedStart$ = new BehaviorSubject<number | null>(null);
  displayCount$ = new BehaviorSubject<number>(Number.MAX_SAFE_INTEGER);
  restReady$ = new BehaviorSubject<boolean>(false);
  mergedRestWidth$ = this.restWidth$.pipe(
    pairwise(),
    map(([prevRestWidth, restWidth]) => Math.max(prevRestWidth, restWidth))
  );
  mergedData$ = combineLatest([this.overflowItems$, this.containerWidth$]).pipe(
    map(([overflowItems, containerWidth]) => {
      let items = overflowItems.toArray();
      if (containerWidth !== null) {
        items = overflowItems
          .toArray()
          .slice(0, Math.min(overflowItems.length, containerWidth / 10));
      }
      return items;
    })
  );
  omittedItems$ = combineLatest([this.overflowItems$, this.displayCount$]).pipe(
    withLatestFrom(this.contentInit$),
    map(([[overflowItems, displayCount]]) => {
      return overflowItems.toArray().slice(displayCount + 1);
    })
  );
  displayRest$ = combineLatest([this.restReady$, this.omittedItems$]).pipe(
    map(([restReady, omittedItems]) => restReady && !!omittedItems.length)
  );

  updateDisplayCount(count: number, notReady?: boolean): void {
    this.displayCount$.next(count);
    if (this.overflowItems && !notReady) {
      this.restReady$.next(count < this.overflowItems.length - 1);
    }
  }

  constructor(
    private nzResizeObserver: NzResizeObserver,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const overflowItems$ = this.overflowItems$.pipe(
      switchMap((items) =>
        merge(
          ...[this.overflowItems$, ...items.map((item) => item.itemWidth$)]
        ).pipe(mergeMap(() => this.overflowItems$))
      )
    );
    this.overflowItems$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.displayCount$.next(Number.MAX_SAFE_INTEGER);
      this.suffixFixedStart$.next(null);
      this.restWidth$.next(0);
      this.suffixWidth$.next(0);
      this.restReady$.next(false);
    });
    combineLatest([
      this.containerWidth$,
      overflowItems$,
      this.mergedRestWidth$,
      this.restWidth$,
      this.suffixWidth$,
      this.mergedData$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([
          containerWidth,
          overflowItems,
          mergedRestWidth,
          restWidth,
          suffixWidth,
          mergedData,
        ]) => {
          if (containerWidth && mergedRestWidth && mergedData) {
            let totalWidth = suffixWidth;

            const len = mergedData.length;
            const lastIndex = len - 1;

            // When data count change to 0, reset this since not loop will reach
            if (!len) {
              this.displayCount$.next(0);
              this.suffixFixedStart$.next(null);
              return;
            }

            for (let i = 0; i < len; i += 1) {
              const currentItemWidth = overflowItems.get(i)?.itemWidth;
              // Break since data not ready
              if (currentItemWidth === undefined) {
                this.updateDisplayCount(i - 1, true);
                break;
              }

              // Find best match
              totalWidth += currentItemWidth;

              if (
                // Only one means `totalWidth` is the final width
                (lastIndex === 0 && totalWidth <= containerWidth) ||
                // Last two width will be the final width
                (i === lastIndex - 1 &&
                  totalWidth + overflowItems.get(lastIndex)!.itemWidth! <=
                    containerWidth)
              ) {
                // Additional check if match the end
                this.updateDisplayCount(lastIndex);
                this.suffixFixedStart$.next(null);
                break;
              } else if (totalWidth + mergedRestWidth > containerWidth) {
                // Can not hold all the content to show rest
                this.updateDisplayCount(i - 1);
                this.suffixFixedStart$.next(
                  totalWidth - currentItemWidth - suffixWidth + restWidth
                );
                break;
              }
              this.cdr.detectChanges();
            }

            if (
              this.overflowSuffix &&
              overflowItems.get(0)!.itemWidth! + suffixWidth > containerWidth
            ) {
              this.suffixFixedStart$.next(null);
            }
            this.cdr.detectChanges();
          }
        }
      );
    this.suffixFixedStart$
      .pipe(takeUntil(this.destroy$))
      .subscribe((suffixFixedStart) => {
        if (suffixFixedStart !== null) {
          this.overflowSuffix?.setSuffixStyle({
            position: 'absolute',
            left: suffixFixedStart,
            top: 0,
          });
        }
      });
    combineLatest([this.displayCount$, this.overflowItems$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([displayCount, overflowItems]) => {
        overflowItems.forEach((item, index) => {
          item.setItemStyle(index <= displayCount, index);
        });
      });
    combineLatest([this.displayRest$, this.displayCount$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([displayRest, displayCount]) => {
        this.overflowRest?.setRestStyle(
          displayRest,
          displayRest ? displayCount : Number.MAX_SAFE_INTEGER
        );
      });
  }
  ngAfterContentInit(): void {
    this.overflowItems?.changes
      .pipe(startWith(this.overflowItems))
      .subscribe(this.overflowItems$);
    this.overflowSuffix?.suffixWidth$.subscribe(this.suffixWidth$);
    this.overflowRest?.restWidth$.subscribe(this.restWidth$);
    this.contentInit$.next();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
