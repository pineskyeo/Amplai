import fileKebabCase from './file-kebab-case.js'
import noListDetailSuffix from './no-list-detail-suffix.js'
import noInterfacePrefix from './no-interface-prefix.js'
import presenterNaming from './presenter-naming.js'
import noDefaultExportModel from './no-default-export-model.js'
import arrayPropPlural from './array-prop-plural.js'
import noDirectSupabase from './no-direct-supabase.js'
import layerBoundary from './layer-boundary.js'
import suffixNaming from './suffix-naming.js'

const harnessPlugin = {
  meta: {
    name: 'amplai-harness',
    version: '1.0.0',
  },
  rules: {
    'file-kebab-case': fileKebabCase,
    'no-list-detail-suffix': noListDetailSuffix,
    'no-interface-prefix': noInterfacePrefix,
    'presenter-naming': presenterNaming,
    'no-default-export-model': noDefaultExportModel,
    'array-prop-plural': arrayPropPlural,
    'no-direct-supabase': noDirectSupabase,
    'layer-boundary': layerBoundary,
    'suffix-naming': suffixNaming,
  },
}

export default harnessPlugin
