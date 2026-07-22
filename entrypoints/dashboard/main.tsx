import { render } from 'preact';
import { App } from './App';
import './styles.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Tabitha could not find its application root.');
render(<App />, root);
