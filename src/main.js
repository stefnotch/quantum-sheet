import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import { cas } from './model/cas'

import 'ant-design-vue/dist/antd.css'

const app = createApp(App)

app.mount('#app')

cas.doneLoading.then(() => {}) // Load the CAS as early as possible
