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
  ɵmarkDirty,
  ContentChild,
  ChangeDetectorRef,
} from '@angular/core';
import { OverflowItemDirective } from './overflow-item.directive';
import { NzResizeObserver } from './resize-observer';
import {
  delay,
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  takeUntil,
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
    <ng-container *ngIf="showRest$ | async"
      ><ng-content select="[appOverflowRest]"></ng-content
    ></ng-container>
    <ng-content select="[appOverflowSuffix]"></ng-content>`,
  providers: [NzResizeObserver],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverflowContainerComponent
  implements OnChanges, OnInit, AfterContentInit, OnDestroy
{
  @Input() maxCount: number | 'responsive' = Infinity;
  maxCount$ = new BehaviorSubject<number | 'responsive'>(this.maxCount);
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
  displayCount$ = new BehaviorSubject<number | null>(null);
  mergedDisplayCount$ = this.displayCount$.pipe(
    map((count) => {
      if (count === null) {
        return Number.MAX_SAFE_INTEGER;
      } else {
        return count || 0;
      }
    })
  );
  restReady$ = new BehaviorSubject<boolean>(false);
  mergedRestWidth$ = this.restWidth$.pipe(
    pairwise(),
    map(([prevRestWidth, restWidth]) => Math.max(prevRestWidth, restWidth))
  );
  isResponsive$ = combineLatest([this.overflowItems$, this.maxCount$]).pipe(
    map(
      ([overflowItems, maxCount]) =>
        maxCount === 'responsive' && overflowItems.length > 0
    )
  );
  invalidate$ = this.maxCount$.pipe(map((maxCount) => maxCount === Infinity));
  showRest$ = combineLatest([
    this.isResponsive$,
    this.maxCount$,
    this.overflowItems$,
  ]).pipe(
    map(
      ([isResponsive, maxCount, overflowItem]) =>
        isResponsive ||
        (typeof maxCount === 'number' && overflowItem.length > maxCount)
    )
  );
  mergedData$ = combineLatest([
    this.overflowItems$,
    this.containerWidth$,
    this.maxCount$,
    this.isResponsive$,
  ]).pipe(
    map(([overflowItems, containerWidth, maxCount, isResponsive]) => {
      let items = overflowItems.toArray();

      if (isResponsive) {
        if (containerWidth === null) {
          items = overflowItems.toArray();
        } else {
          items = overflowItems
            .toArray()
            .slice(0, Math.min(overflowItems.length, containerWidth / 10));
        }
      } else if (typeof maxCount === 'number') {
        items = overflowItems.toArray().slice(0, maxCount);
      }
      return items;
    })
  );
  omittedItems$ = combineLatest([
    this.overflowItems$,
    this.mergedData$,
    this.isResponsive$,
    this.mergedDisplayCount$,
  ]).pipe(
    map(([overflowItems, mergedData, isResponsive, mergedDisplayCount]) => {
      if (isResponsive) {
        return overflowItems.toArray().slice(mergedDisplayCount + 1);
      }
      return overflowItems.toArray().slice(mergedData.length);
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
              const currentItemWidth = overflowItems.get(i)!.itemWidth;
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
                this.displayCount$.next(i - 1);
                this.suffixFixedStart$.next(
                  totalWidth - currentItemWidth - suffixWidth + restWidth
                );
                break;
              }
            }

            if (
              this.overflowSuffix &&
              overflowItems.get(0)!.itemWidth! + suffixWidth > containerWidth
            ) {
              this.suffixFixedStart$.next(null);
            }
          }
          this.cdr.detectChanges();
          // ɵmarkDirty(this);
        }
      );
    combineLatest([this.suffixFixedStart$, this.isResponsive$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([suffixFixedStart, isResponsive]) => {
        if (suffixFixedStart !== null && isResponsive) {
          this.overflowSuffix?.setSuffixStyle({
            position: 'absolute',
            left: suffixFixedStart,
            top: 0,
          });
        }
      });
    combineLatest([
      this.isResponsive$,
      this.invalidate$,
      this.mergedDisplayCount$,
      this.overflowItems$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([isResponsive, invalidate, mergedDisplayCount, overflowItems]) => {
          overflowItems.forEach((item, index) => {
            item.setItemStyle(
              isResponsive,
              index < mergedDisplayCount,
              invalidate,
              index
            );
          });
        }
      );
    combineLatest([
      this.isResponsive$,
      this.displayRest$,
      this.invalidate$,
      this.mergedDisplayCount$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([isResponsive, displayRest, invalidate, mergedDisplayCount]) => {
          this.overflowRest?.setRestStyle(
            isResponsive,
            displayRest,
            invalidate,
            displayRest ? mergedDisplayCount : Number.MAX_SAFE_INTEGER
          );
        }
      );
  }
  ngAfterContentInit(): void {
    this.overflowItems?.changes
      .pipe(startWith(this.overflowItems))
      .subscribe(this.overflowItems$);
    this.overflowSuffix?.suffixWidth$.subscribe(this.suffixWidth$);
    this.overflowRest?.restWidth$.subscribe(this.restWidth$);
  }

  ngOnChanges({ maxCount }: SimpleChanges): void {
    if (maxCount) {
      this.maxCount$.next(this.maxCount);
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
