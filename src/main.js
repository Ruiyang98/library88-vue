// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import ElementUI from 'element-ui'
import store from './store'
import 'element-ui/lib/theme-chalk/index.css'

// 设置反向代理
var axios = require('axios')
axios.defaults.baseURL = 'http://localhost:8443/api'
//  axios 主动开启 withCredentials 功能,让前端能够带上 cookie
axios.defaults.withCredentials = true
// 全局注册，之后可在其他组件中通过this.$axios发送数据
Vue.prototype.$axios = axios
Vue.config.productionTip = false

Vue.use(ElementUI)

// 使用钩子函数判断是否拦截,在访问每一个路由前调用
router.beforeEach((to, from, next) => {
  if (store.state.username && to.path.startsWith('/admin')) {
    initAdminMenu(router, store)
  }
  // 已登录状态下访问 login 页面直接跳转到后台首页
  if (store.state.username && to.path.startsWith('/login')) {
    next({
      name: 'Dashboard'
    })
  }
  // 首先判断访问的路径是否需要被拦截进行登录
  // 如果前端没有登录信息则直接拦截，如果有则判断后端是否正常登录（防止构造参数绕过）
  if (to.meta.requireAuth) {
    if (store.state.username) {
      axios.get('/authentication').then(resp => {
        console.log(resp)
        if (resp.data) {
          next()
        }
      })
    } else {
      next({
        // 否则跳转到登录页面
        // 并存储访问的页面路径（以便在登录后跳转到访问页）
        path: 'login',
        query: {redirect: to.fullPath}
      })
    }
  } else {
    next()
  }
}
)

// 用于执行请求，调用格式化方法并向路由表中添加信息
const initAdminMenu = (router, store) => {
  // 防止重复触发加载菜单操作
  if (store.state.adminMenus.length > 0) {
    return
  }
  axios.get('/menu').then(resp => {
    if (resp && resp.status === 200) {
      var fmtRoutes = formatRoutes(resp.data)
      router.addRoutes(fmtRoutes)
      store.commit('initAdminMenu', fmtRoutes)
    }
  })
}

// 格式转换：将后台传来的数据，整理成路由能够识别的格式
const formatRoutes = (routes) => {
  let fmtRoutes = []
  routes.forEach(route => {
    if (route.children) {
      route.children = formatRoutes(route.children)
    }

    let fmtRoute = {
      path: route.path,
      component: resolve => {
        require(['./components/admin/' + route.component + '.vue'], resolve)
      },
      name: route.name,
      nameZh: route.nameZh,
      iconCls: route.iconCls,
      meta: {
        requireAuth: true
      },
      children: route.children
    }
    fmtRoutes.push(fmtRoute)
  })
  return fmtRoutes
}

/* eslint-disable no-new */
new Vue({
  el: '#app',
  render: h => h(App),
  router,
  // 加入store
  store,
  components: { App },
  template: '<App/>'
})
