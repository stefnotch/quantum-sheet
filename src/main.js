import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import { cas } from './model/cas'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'

const app = createApp(App)

app.use(Antd)
app.mount('#app')

cas.doneLoading.then(() => {}) // Load the CAS as early as possible
