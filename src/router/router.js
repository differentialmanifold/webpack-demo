// 0. If using a module system, call Vue.use(VueRouter)
import Vue from 'vue'
import VueRouter from 'vue-router'

import vFirst from '../components/first-component/index.vue';
import vSecond from '../components/second-component/index.vue';
import vThird from '../components/third-component/index.vue';
import elementUI from '../components/element-ui/index.vue';
import todoList from '../components/todoList/App.vue';
import main from '../components/main/App.vue';

Vue.use(VueRouter)

const routes = [
  { path: '/first', component: vFirst },
  { path: '/second', component: vSecond },
  { path: '/third', component: vThird },
  { path: '/element-ui', component: elementUI },
  { path: '/todolist', component: todoList },
  { path: '/main', component: main }
]

export default new VueRouter({
  mode: 'history',
  base: __dirname,
  routes
})
