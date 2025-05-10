import createRenderer from "./createRender";


const renderer = createRenderer();

/**
 * 首次渲染
 * 渲染器会将 vnode1 渲染为真实 DOM。渲染完成后，vnode1 会存储到容器元素的 container._vnode 属性中，它会在后续渲染中作为旧 vnode 使用。
 */
renderer.render(vnode1, document.querySelector('#app'));

/**
 * 第二次渲染 
 * 打补丁，**patch**
 * 挂载可以看作一种特殊的打补丁，特殊在于旧的vnode是不存在的
 * 在第二次渲染时，旧 vnode 存在，此时渲染器会把 vnode2 作为新 vnode，并将新旧 vnode 一同传递给 patch 函数进行打补丁。
*/ 
renderer.render(vnode2, document.querySelector('#app'));


/**
 * 第三次渲染
 * 在第三次渲染时，新 vnode 的值为 null，即什么都不渲染。但此时容器中渲染的是vnode2 所描述的内容，所以渲染器需要清空容器。
 */
renderer.render(null, document.querySelector('#app'));