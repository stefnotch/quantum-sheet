import { notification } from 'ant-design-vue'

function objToString(value: any) {
  if (typeof value === 'string') {
    return value
  } else {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return value + ''
    }
  }
}

function notify(type: 'success' | 'error' | 'warning', message: string, details: any) {
  let description = objToString(details)
  const config = {
    message,
    description,
  }
  notification[type](config)
}

function log(message: string, details: any) {
  let description = objToString(details)
  const config = {
    message,
    description,
  }
  notification.info(config)
}

function warn(message: string, details: any) {
  let description = objToString(details)
  const config = {
    message,
    description,
  }
  notification.warn(config)
}

function error(message: string, details: any) {
  let description = objToString(details)
  const config = {
    message,
    description,
  }
  notification.error(config)
}

export { notify, log, warn, error }
