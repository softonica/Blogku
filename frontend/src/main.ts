import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { MockSource } from './api/mock.source'
import { setDataSource } from './api'
import './styles/main.css'

setDataSource(new MockSource())

// Load Google Font asynchronously to keep critical render path non-blocking
if (typeof document !== 'undefined') {
  const fontLink = document.createElement('link')
  fontLink.rel = 'stylesheet'
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap'
  document.head.appendChild(fontLink)
}

const app = createApp(App)
app.use(createPinia())
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
