import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AttributeSerializerService } from 'attributes';
import { ContextModule, ParamContextExtractorService } from 'context';
import { CrudAdaptorPluginManager } from './services/crud-adaptor-plugin-manager.service';
import { DatasourcePluginManager } from 'datasource';
import { DparamModule, ParamEvaluatorService } from 'dparam';
import { UrlGeneratorService } from 'durl';
import { MaterialModule } from 'material';
import { CrudAdaptorDatasourceFormComponent } from './components/crud-adaptor-datasource-form/crud-adaptor-datasource-form.component';
import { CrudAdaptorDatasourceComponent } from './components/crud-adaptor-datasource/crud-adaptor-datasource.component';
import { crudAdaptorDatasourcePluginFactory } from './crud.factories';

@NgModule({
  declarations: [
    CrudAdaptorDatasourceComponent,
    CrudAdaptorDatasourceFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    ContextModule,
    DparamModule
  ],
  exports: [
    CrudAdaptorDatasourceComponent,
    CrudAdaptorDatasourceFormComponent
  ]
})
export class CrudModule { 
  constructor(
    dpm: DatasourcePluginManager,
    cpm: CrudAdaptorPluginManager,
    paramContextExtractor: ParamContextExtractorService,
    attributeSerializer: AttributeSerializerService,
    paramEvaluatorService: ParamEvaluatorService
  ) {
    dpm.register(crudAdaptorDatasourcePluginFactory(paramContextExtractor, attributeSerializer, cpm, paramEvaluatorService));
  }
}
