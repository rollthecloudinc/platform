//import { EntityMetadataMap } from '@ngrx/data';
import { CrudEntityMetadataMap, CrudEntityQueryMapping } from 'crud';

export const entityMetadata: CrudEntityMetadataMap = {
  PanelPageListItem: {
    entityName: 'PanelPageListItem',
    crud: {
      rest: {
        ops: ['query'],
        params: {
          entityName: 'PanelPageListItem'
        }
      },
      idb_keyval: {
        params: {
          prefix: 'panelpage__'
        },
        queryMappings: new Map<string, CrudEntityQueryMapping>([
          ['path', { defaultOperator: 'startsWith' }]
        ])
      }
    }
  },
  PanelPage: {
    entityName: 'PanelPage',
    crud: {
      /*aws_s3_entity: {
        ops: ['query'],
        params: {
          bucket: 'classifieds-ui-dev',
          prefix: 'panelpages/'
        }
      },*/
      rest: {
        ops: ['query'],
        params: {
          entityName: 'PanelPage'
        }
      },
      idb_keyval: {
        params: {
          prefix: 'panelpage__'
        }
      }
    }
  },
  PanelPageState: {
    entityName: 'PanelPageState'
  }
};
