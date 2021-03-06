
import DgTableHeader from './components/table-header'
import DgTableDateFilter from './filters/date'
import DgTableCascader from './filters/cascader'
import Bus from './js/Bus'
import { Dom } from './js/utils'
import ElTable from 'element-ui/lib/table'

// 私有函数的集合 相当于注册函数
const privateHandlers = [
  'filter-change'
]

// 私有属性
const privateProps = [
  'tableId'
]

// 筛选器点击 部分 特殊筛选器 对应的事件
const headClickEven = {
  'date': '__OPEN_DGTABLE_DATE_FILTER__',
  'cascader': '__OPEN_DGTABLE_CASCADER_FILTER__'
}

const filtersData = {
  regFilters: {},
  filterComponents: {
    'date': DgTableDateFilter,
    'cascader': DgTableCascader
  },
  curFilterId: ''
}

const createFilterId = (UNID, ft, p) => {
  return `__${UNID}_${ft}_${p}__`
}

const headClick = (filterId) => {
  const { regFilters } = filtersData
  const { type } = regFilters[filterId]
  filtersData.curFilterId = filterId
  if (headClickEven[type]) {
    Bus.$emit(headClickEven[type], filterId)
  }
}

// 规范化表格props 和 列配置 数据
const normalizeProps = (context) => {
  const props = JSON.parse(JSON.stringify(context.$props || {}))
  
  for (let k in props) {
    if (privateProps.includes(k)) {
      delete props[k]
    }
  }
  delete props.configs
  const on = context._events
  const scopedSlots = context.$scopedSlots
  const attrs = {}


  let privateOn = Object.create(null)
  for (let k in on) {
    if (privateHandlers.includes(k)) {
      privateOn[k] = on[k]
    }
  }

  return {
    on,
    scopedSlots,
    attrs,
    props,
    privateOn
  }
}
// 渲染 需要的筛选器
const renderFilters = (h, configs, on, UNID) => {
  const { regFilters, filterComponents } = filtersData
  const { filterConfig = null, columnConfig } = configs

  let filter_id = 'null'
  let willRenderFilter = null
  if (filterConfig) {
    filter_id = createFilterId(
      UNID,
      filterConfig.type,
      columnConfig.prop
    )
    if (!regFilters[filter_id]) {
      regFilters[filter_id] = filterConfig
    }
    if (filterComponents[filterConfig.type]) {
      if (!filterConfig.component) {
        willRenderFilter = filterComponents[filterConfig.type]
      } else {
        willRenderFilter = filterConfig.component
      }
    } else if(filterConfig.component
        && filterConfig.type === 'custom'
      ) {
      willRenderFilter = filterConfig.component
    }
  }
  let _private = {}
  if (filterConfig) {
    _private = filterConfig.type === 'custom' 
      ? {}
      : {
          refname: filter_id,
          key: columnConfig.prop,
        }
  }
  return (
    filterConfig
      ? h('div', {
          attrs: {
            dataId:filter_id,
            'class': filterComponents[filterConfig.type]
                    ? 'dg-table_filter-wrap dg-table_filter-hideBg'
                    : 'dg-table_filter-wrap'
          }
        }, [
            h(willRenderFilter, {
                props: {
                  config: Object.assign({}, _private, filterConfig.props || {})
                },
                on: {
                  __DGTABLE_GET_FILTER_DATA__: (res) => {
                    hideAllFilter(null, UNID)
                    if (typeof on['filter-change'] === 'function') {
                      on['filter-change'](res)
                    }
                  },
                  __CUSTOM_FILTER_DATA__: (custom_data) => {
                    hideAllFilter(null, UNID)
                    if (typeof on['filter-change'] === 'function') {
                      let res = Object.create(null)
                      if (custom_data.value !== undefined) {
                        res.value = custom_data.value
                      }
                      if (custom_data.label !== undefined) {
                        res.label = custom_data.label
                      }
                      on['filter-change']({
                        key: columnConfig.prop,
                        type: 'custom',
                        res
                      })
                    }
                  }
                }
            })
          ])
      : null
  )
}
const hideAllFilter = (e, UNID) => {
  const headerIconDoms = 
    document.querySelectorAll(`#__${UNID}_DGTABLE__ .dg-header-icon`)
  const filterDoms = 
    document.querySelectorAll(`#__${UNID}_DGTABLE__ .dg-table_filter-wrap`)
  const cellDom = e ? Dom.parents(e.target, '.cell') : null
  let id = ''
  
  const specialDom = e ? Dom.parents(e.target, '.el-popper') : null

  if (cellDom &&
      cellDom.childNodes &&
      cellDom.childNodes[0] &&
      cellDom.childNodes[0].getAttribute
    ) {
    id = cellDom.childNodes[0].getAttribute('id')
  }
  if (id) {
    for (let i = 0, length = headerIconDoms.length; i < length; i++) {
      if (headerIconDoms[i].parentNode.getAttribute('id') !== id) {
        filterDoms[i] && (filterDoms[i].style.display = 'none')
        headerIconDoms[i] && (headerIconDoms[i].style.transform = 'rotate(0deg)')
      }
    }
  } else if (!specialDom) {
    for (let i = 0, length = headerIconDoms.length; i < length; i++) {
      filterDoms[i] && (filterDoms[i].style.display = 'none')
      headerIconDoms[i] && (headerIconDoms[i].style.transform = 'rotate(0deg)')
    }
  }
}

export default {
  props: Object.assign({}, {
    configs: Array,
    tableId: String
  }, ElTable.props),
  name: 'dg-table',
  functional: false,
  methods: {},
  beforeUpdate () {
    // console.log('dg-table update')
  },
  render (h) {
    const UNID = this.tableId || 'DGTABLE'
    const {
      on,
      scopedSlots,
      props,
      privateOn } = normalizeProps(this._self)
    const configs = this.configs ||  []
    let filterVnodes = []
    // 渲染列
    const renderColumn = configs => configs.map((item, index) => {
      const columnConfig = item.columnConfig || {}
      const filterConfig = item.filterConfig || null
      const component = item.component || null
      const curFilter = renderFilters(h, item, privateOn, UNID)
      curFilter && filterVnodes.push(curFilter)

      // 如果有自定义 列 标记有作用域槽
      let renderScopedSlots = {}
      if (component) {
        renderScopedSlots = {
          default: ({row, column}) => {
            return h('div',
              {},
              [
                component
                ? h(component, {
                  props: {
                    row,
                    column
                  }
                })
                : row[columnConfig.prop]
              ]
            )
          }
        }
      }
      return h('el-table-column',
        {
          props:columnConfig,
          scopedSlots: renderScopedSlots,
          key: `__dg_column_${index}__`
        },
        [ filterConfig ? h('template',
            {slot: 'header'},
            [
              h(DgTableHeader, {
                props: {
                  id: createFilterId(
                    UNID,
                    filterConfig && filterConfig.type || 'null',
                    columnConfig.prop
                  ),
                  label: columnConfig.label,
                  config: filterConfig || null,
                  cb: headClick,
                  UNID: UNID
                }
              })
            ]
          ) : null,
        ])
    })
    // return h('div', ['dd'])
    return h('div', {
      attrs: {
        id: `__${UNID}_DGTABLE__`
      }
    }, [
      h(
        ElTable,
        {
          props: props,
          on,
          scopedSlots
        },
        renderColumn(configs)
      ),
      h('div', {
        'class': 'dg-filters_hidden-wrap',
        directives: [
          {
            name: 'dg_table_clickoutside',
            expression: (e) => {
              hideAllFilter(e, UNID)
            }
          }
        ]
      }, filterVnodes)
    ])
  }
}


