import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges, ElementRef, Inject, TemplateRef, ComponentFactoryResolver, ComponentRef } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { EntityServices, EntityCollectionService } from '@ngrx/data';
import { CONTENT_PLUGIN, ContentPlugin, ContentPluginManager } from 'content';
import { GridLayoutComponent, LayoutPluginManager } from 'layout';
import { /*ContextManagerService, */ InlineContext, ContextPluginManager } from 'context';
import { PanelPage, Pane, LayoutSetting } from 'panels';
import { PanelPageForm } from '../../models/form.models';
import { PageBuilderFacade } from '../../features/page-builder/page-builder.facade';
import { DisplayGrid, GridsterConfig, GridType, GridsterItem } from 'angular-gridster2';
import { fromEvent, Subscription, BehaviorSubject, Subject, iif, of, forkJoin, Observable } from 'rxjs';
import { filter, tap, debounceTime, take, skip, scan, delay, switchMap, map } from 'rxjs/operators';
import { getSelectors, RouterReducerState } from '@ngrx/router-store';
import { Store, select } from '@ngrx/store';
import { InlineContextResolverService } from '../../services/inline-context-resolver.service';
import { LayoutRendererHostDirective } from '../../directives/layout-renderer-host.directive';
import * as uuid from 'uuid';

@Component({
  selector: 'classifieds-ui-panel-page',
  templateUrl: './panel-page.component.html',
  styleUrls: ['./panel-page.component.scss']
})
export class PanelPageComponent implements OnInit, OnChanges {

  @Input()
  id: string;

  @Input()
  panelPage: PanelPage;

  @Input()
  nested = false;

  @Input()
  contexts: Array<InlineContext>;

  resolvedContext: any;
  contextChanged: { name: string };
  layoutRendererRef: ComponentRef<any>;

  pageForm = this.fb.group({
    /*name: this.fb.control(''),
    title: this.fb.control(''),
    derivativeId: this.fb.control(''),*/
    panels: this.fb.array([])
  });

  resolveSub: Subscription;

  options: GridsterConfig = {
    gridType: GridType.Fit,
    displayGrid: DisplayGrid.None,
    pushItems: false,
    draggable: {
      enabled: false
    },
    resizable: {
      enabled: false
    },
    mobileBreakpoint: 0
  };

  // private contentPlugins: Array<ContentPlugin> = [];

  private panelPageService: EntityCollectionService<PanelPage>;

  private schedulePageFetch = new Subject();
  private pageFetchSub = this.schedulePageFetch.pipe(
    switchMap(() => this.panelPageService.getByKey(this.id)),
    switchMap(p =>
      this.cpm.getPlugins(
        p.panels.reduce<Array<string>>((contentPlugins, c) => {
          c.panes.forEach(pane => {
            if(!contentPlugins.includes(pane.contentPlugin)) {
              contentPlugins.push(pane.contentPlugin);
            }
          });
          return contentPlugins;
        }, [])
      ).pipe(
        map<Map<string, ContentPlugin>, [PanelPage, boolean]>(contentPlugins => [p, p.panels.reduce<Array<Pane>>((panes, panel) => [ ...panes, ...panel.panes ], []).map(pane => contentPlugins.get(pane.contentPlugin).handler?.isDynamic(pane.settings) ).findIndex(d => d === true) !== -1])
      )
    )
  ).subscribe(([p, isDynamic]) => {
    this.contexts = p.contexts ? p.contexts.map(c => new InlineContext(c)) : [];
    this.panelPage = p;
    this.populatePanelsFormArray();
    if(!this.nested || isDynamic ) {
      this.hookupContextChange();
    }
    if (p.layoutType === 'gridless') {
      this.renderLayoutRenderer();
    } else {
      const viewContainerRef = this.layoutRendererHost.viewContainerRef;
      viewContainerRef.clear();
    }
  });

  @ViewChild(GridLayoutComponent, {static: false}) gridLayout: GridLayoutComponent;
  @ViewChild('renderPanelTpl', { static: true }) renderPanelTpl: TemplateRef<any>;
  @ViewChild(LayoutRendererHostDirective, { static: false }) layoutRendererHost: LayoutRendererHostDirective;

  get panelsArray(): FormArray {
    return this.pageForm.get('panels') as FormArray;
  }

  get columnSettings(): Array<LayoutSetting> {
    const settings = this.panelPage ? this.panelPage.panels.reduce<Array<LayoutSetting>>((p, c) => [ ...p, new LayoutSetting(c.columnSetting) ], []) : [];
    return settings;
  }

  /*get pageIsDynamic() {
    return this.panelPage.panels.reduce<Array<[Pane, ContentPlugin]>>((p2, c) => [ ...p2, ...c.panes.map<[Pane, ContentPlugin]>(p3 => [p3, this.contentPlugins.find(cp => cp.name === p3.contentPlugin)]) ], []).find(([p2, cp]) => cp.handler && cp.handler.isDynamic(p2.settings)) !== undefined;
  }*/

  constructor(
    // @Inject(CONTENT_PLUGIN) contentPlugins: Array<ContentPlugin>,
    private routerStore: Store<RouterReducerState>,
    private fb: FormBuilder,
    private el: ElementRef,
    private inlineContextResolver: InlineContextResolverService,
    // private contextManager: ContextManagerService,
    private pageBuilderFacade:PageBuilderFacade,
    private cpm: ContentPluginManager,
    private cxm: ContextPluginManager,
    private lpm: LayoutPluginManager,
    private componentFactoryResolver: ComponentFactoryResolver,
    es: EntityServices,
  ) {
    // this.contentPlugins = contentPlugins;
    this.panelPageService = es.getEntityCollectionService('PanelPage');
  }

  ngOnInit(): void {
    /*if(!this.nested) {
      console.log('hookup');
      const nav$ = fromEvent(this.el.nativeElement, 'click').pipe(
        //filter(evt => (evt as any).target.closest('a') !== null),
        tap(() => alert('Hello'))
      );
    }*/
    if(this.id !== undefined) {
      // this.fetchPage();
      this.schedulePageFetch.next();
    } else if(this.panelPage !== undefined) {
      this.populatePanelsFormArray();
    }
    if(!this.nested) {
      const { selectCurrentRoute } = getSelectors((state: any) => state.router);
      this.routerStore.pipe(
        select(selectCurrentRoute),
        filter(() => this.panelPage !== undefined)
      ).subscribe(route => {
          //this.panelPage = new PanelPage({ ...this.panelPage });
      });
    }
    if(this.nested && this.id === undefined) {
      this.hookupContextChange();
    }
    this.pageForm.valueChanges.pipe(
      debounceTime(100),
      filter(() => this.panelPage !== undefined && this.panelPage.displayType === 'form'),
      tap(() => console.log('page form value change'))
    ).subscribe(v => {
      const form = new PanelPageForm({ ...v, name: this.panelPage.name, title: this.panelPage.title, derivativeId: this.panelPage.id});
      this.pageBuilderFacade.setForm(this.panelPage.name, form);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if(!this.nested && !changes.id.firstChange && changes.id.previousValue !== changes.id.currentValue) {
      // this.fetchPage();
      this.schedulePageFetch.next();
    }
  }

  /*fetchPage() {
    this.panelPageService.getByKey(this.id).subscribe(p => {
      /*if(this.nested) {
        this.contexts =
      } else {
        this.contexts = [];
      }*/
      /*console.log(p);
      this.contexts = p.contexts ? p.contexts.map(c => new InlineContext(c)) : [];
      this.panelPage = p;
      this.populatePanelsFormArray();

      if(!this.nested || this.pageIsDynamic ) {
        this.hookupContextChange();
      }
    });
  }*/

  onHeightChange(height: number, index: number) {
    this.gridLayout.setItemContentHeight(index, height);
  }

  populatePanelsFormArray() {
    this.panelsArray.clear();
    this.panelPage.panels.forEach((p, i) => {
      this.panelsArray.push(this.fb.control(''));
    });
  }

  hookupContextChange() {
    if(this.resolveSub !== undefined) {
      this.resolveSub.unsubscribe();
    }
    this.inlineContextResolver.resolveMerged(this.contexts, `panelpage:${uuid.v4()}`).pipe(
      switchMap(resolvedContext => this.cxm.getPlugins().pipe(
        map(plugins => [resolvedContext, Array.from(plugins.values()).filter(p => p.global === true)])
      )),
      take(1)
    ).subscribe(([resolvedContext, globalPlugins]) => {
      this.resolvedContext = resolvedContext;
      console.log(this.resolvedContext);
      this.resolveSub = this.inlineContextResolver.resolveMergedSingle(this.contexts).pipe(
        skip(globalPlugins.length + (this.contexts ? this.contexts.length : 0))
      ).subscribe(([cName, cValue]) => {
        console.log(`context changed [${this.panelPage.name}]: ${cName}`);
        this.contextChanged = { name: cName };
        this.resolvedContext = { ...this.resolvedContext, [cName]: cValue };
      });
    });
  }

  submit() {
    const panelPage = new PanelPage(this.pageForm.value);
  }

  renderLayoutRenderer() {

    this.lpm.getPlugin('gridless').pipe(
      delay(1)
    ).subscribe(p => {

      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(p.renderer);

      const viewContainerRef = this.layoutRendererHost.viewContainerRef;
      viewContainerRef.clear();
  
      this.layoutRendererRef = viewContainerRef.createComponent(componentFactory);
      (this.layoutRendererRef.instance as any).renderPanelTpl = this.renderPanelTpl;

    });

  }

}
