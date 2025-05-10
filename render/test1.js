import createRenderer from "./createRender"

const vnode = {
  type: 'h1',
  children: 'Hello World'
};

const renderer = createRenderer();

renderer.render(vnode, document.querySelector('#app'));