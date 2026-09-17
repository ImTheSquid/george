import { mount } from 'svelte';
import App from './App.svelte';
import './newtab.css';

mount(App, { target: document.getElementById('app')! });
