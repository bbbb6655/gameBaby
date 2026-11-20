import { createApp } from 'vue'
import AccountApp from './AccountApp.vue'
import './styles/common.css'
import './styles/mobile.css'
import './styles/desktop.css'
import './styles/account.css'

createApp(AccountApp, { mode: 'desktop' }).mount('#app')
