import Vue from 'vue'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import router from '@/router/router';
import App from '@/App.vue'
import '@/assets/icon/iconfont.css';


Vue.use(ElementUI);

new Vue({
  router,
  render: function(h){
    return h(App);
  }
}).$mount('#app');