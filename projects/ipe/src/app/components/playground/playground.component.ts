import { Component, OnInit } from "@angular/core";
import { EntityCollectionService, EntityServices } from "@ngrx/data";
import { AttributeValue } from "attributes";
import { Pane, PanelPage, PanelContentHandler, Panel } from "panels";
import { forkJoin, iif, Observable, of } from "rxjs";
import { map, switchMap, tap } from "rxjs/operators";
import { JSONPath } from 'jsonpath-plus';

@Component({
  template: `Playground`
})
export class PlaygroundComponent implements OnInit {
  get panelPageService(): EntityCollectionService<PanelPage> {
    return this.es.getEntityCollectionService('PanelPage');
  }
  constructor(
    private es: EntityServices,
    private panelHandler: PanelContentHandler
  ) {
  }
  ngOnInit() {
    this.getByKey('183fbb6c-4fc7-11eb-a003-aa11747f279e').subscribe(p => {
      console.log(p);
      const result = JSONPath({ path: '$.panels[0].panes[0].nestedPage.panels[0].panes[0]', json: p });
      // select nested page
      // rebuild without other panels and without target - 2 separate.
      console.log(result);
    });
  }
  reducePage(pp: PanelPage): Array<Observable<[number, number, PanelPage]>> {
    return pp.panels.reduce((p, c, i) => this.reducePanels(p, c, i), []);
  }
  reducePanels(p: Array<Observable<[number, number, PanelPage]>>, c: Panel, i: number): Array<Observable<[number, number, PanelPage]>> {
    return [ ...p, ...c.panes.reduce((p2, c2, i2) => this.reducePanes(p2, c2, i2).map(o => o.pipe(map(([i3, pp]) => [i, i3, pp]))), []) ];
  }
  reducePanes(p: Array<Observable<[number, PanelPage]>>, c: Pane, i: number): Array<Observable<[number, PanelPage]>> {
    return [ 
      ...p,
      ...(
        c.contentPlugin === 'panel' ? 
        [
          this.nestedPage$(c).pipe(
            map(pp => [i, pp])
          )
        ] : 
        []
      ) 
    ] as Array<Observable<[number, PanelPage]>>;
  }
  nestedPage$(p: Pane): Observable<PanelPage> {
    console.log('get nested panel page');
    return p.linkedPageId && p.linkedPageId !== '' ? this.getByKey(p.linkedPageId).pipe(tap(() => console.log(`get(${p.linkedPageId})`))) : this.getEmbedded(p.settings).pipe(tap(() => console.log('toObject()')));
  }
  remapNested(p: PanelPage, nested: Array<[number, number, PanelPage]>): void {
    nested.forEach(([index1, index2, np]) => {
      p.panels[index1].panes[index2].nestedPage = np;
    });
  }
  getByKey(key: string): Observable<PanelPage> {
    return this.panelPageService.getByKey(key).pipe(
      map(p => new PanelPage(p)),
      switchMap(p => iif(
        () => this.reducePage(p).length > 0,
        forkJoin(this.reducePage(p)).pipe(
          tap(nested => this.remapNested(p, nested)),
          map(() => p)
        ),
        of(p)
      ))
    );
  }
  getEmbedded(settings: Array<AttributeValue>): Observable<PanelPage> {
    return this.panelHandler.toObject(settings).pipe(
      map<PanelPage, PanelPage>(p => new PanelPage(p)),
      switchMap(p => iif<PanelPage, PanelPage>(
        () => this.reducePage(p as PanelPage).length > 0,
        forkJoin(this.reducePage(p as PanelPage)).pipe(
          tap(nested => this.remapNested(p as PanelPage, nested)),
          map(() => p)
        ),
        of(p)
      ))
    );
  }

  // selector trials


}