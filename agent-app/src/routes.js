import HomePage from './pages/HomePage.vue';
import ChatPage from './pages/ChatPage.vue';
import ProfilePage from './pages/ProfilePage.vue';
import SettingsPage from './pages/SettingsPage.vue';

export default [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/chat/:id',
    component: ChatPage,
  },
  {
    path: '/profile/',
    component: ProfilePage,
  },
  {
    path: '/settings/',
    component: SettingsPage,
  },
];
