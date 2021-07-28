import mitt from 'mitt'

type Events = {
  'update-document-data': string
  'serialize-document': undefined
}

const emitter = mitt<Events>()
export default emitter
