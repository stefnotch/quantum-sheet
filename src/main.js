import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import mitt from 'mitt';

const emitter = mitt();

const app = createApp(App)
app.config.productionTip = false;
// app.config.globalProperties.$emitter = emitter;
app.provide('$emitter', emitter);
app.use(Antd)
app.mount("#app");