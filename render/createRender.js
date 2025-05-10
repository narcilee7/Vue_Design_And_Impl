export default function createRenderer(options) {
  // 获取操作DOM的api
  const {
    createElement,
    insert,
    setElementText,
    patchProps,
    createText,
    setText,
  } = options;


  function render(vnode, container) {
    if (vnode) {
      // 新vnode存在，将其与旧的vnode一起传递给patch函数
      patch(container._vnode, vnode, container);
    } else {
      if (container._vnode) {
        // 旧的vnode存在，且新的vnode不存在，说明是卸载操作(unmount)
        unmount(container._vnode);
      }
    }
    // 把vnode存储在container._vnode下，即后续渲染的vnode
    container._vnode = vnode;
  }


  /**
   * path
   * @param {*} n1 
   * @param {*} n2 
   * @param {*} container
   * @param {dom} anchor 锚点元素
   */
  function patch(n1, n2, container, anchor) {
    // 如果n1存在, 则对比n1和n2的类型
    if (n1 && n1.type !== n2.type) {
      // 如果新旧vnode的类型不同，则直接将旧vnode卸载
      unmout(n1);
      n1 = null;
    }
    const { type } = n2;
    if (typeof type === 'string') {
      if (!n1) {
        mountElement(n2, container, anchor);
      } else {
        patchElement(n1, n2);
      }
    }
    else if (typeof type === 'object') {
      // 如果n2.type描述的值是对象，则说明是**组件**
    }
    else if (type === 'Text') {
      // 处理其他的vnode
      if (!nil) {
        // 创建文本节点(调用平台API)
        const el = n2.el = createText(n2.children);
        // 将文本节点插入到容器中
        insert(el, container);
      } else {
        // 如果旧的vnode存在，只需要使用新文本节点的文本内容更新旧文本节点即可
        const el = n2.el = n1.el;
        if (n2.children !== n1.children) {
          // 调用setText
          setText(el, n2.children);
        }
      }
    }
    else if (type === 'Fragment') {
      if (!n1) {
        // 如果旧的vnode不存在，只需要将Fragment的children逐个挂载即可
        n2.children.forEach(c => patch(null, c, container));
      } else {
        // 只需要更新Fragement的children即可
        patchChildren(n1, n2, container);
      }
    }
  }

  function shouldSetAsProps(el, key, value) {
    // 特殊处理，对于只读的属性特殊处理
    if (key === 'form' && el.tagName === 'INPUT') return false;
    return key in el
  }

  /**
   * 挂载
   * @param {*} vnode 
   * @param {*} container 
   */
  function mountElement(vnode, container) {
    // 创建dom元素
    const el = document.createElement(vnode.type);
    // 处理子节点, 如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children;
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el);
      });
    }
    // 处理属性
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key])
      }
    }
    // 调用insert函数将元素插入到容器内
    insert(el, container);
  }


  /**
   * 卸载
   * @param {*} vnode 
   * @param {*} container 
   */
  const unmount(vnode) {
    // 如果类型为Fragment, 则需要卸载其children
    if (vnode.type === 'Fragment') {
      vnode.children.forEach(c => {
        unmount(c);
      });
    }
    const parent = vnode.el.parentNode;
    if (parent) {
      parent.removeChild(vnode.el);
    }
  }

  function patchElement(n1, n2) {
    const el = n2.el = n1.el;
    const oldProps = n1.props;
    const newProps = n2.props;
    // 第一步：更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }
    // 更新children
    patchChildren(n1, n2, el);
  }

  function patchChildren(n1, n2, container) {
    // 判断是否是文本节点
    if (typeof n2.children === 'string') {
      // 旧子节点的类型有三种可能: 没有子节点、文本子节点以及一组子节点
      // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      }
      // 挂载新的文本子节点给容器元素
      setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      // 说明新的子节点是一组子节点
      
      // 判断旧子节点是否也是一组子节点
      if (Array.isArray(n1.children)) {
        // DOM Diff
        const oldChildren = n1.children;
        const newChildren = n2.children;
        // 用来存储寻找过程中遇到的最大索引值
        let lastIndex = 0;
        // 在移动DOM之前，需要先完成打补丁操作
        for (let i = 0; i < newChildren.length; i++) {
          const newVNode = newChildren[i];
          // 遍历旧的children
          let j = 0;
          // 第一层循环中定义遍历find，表示是否在旧的一组节点中找到可复用的节点
          let find = false;
          for (let j = 0; j < oldChildren.length; j++) {
            const oldVNode = oldChildren[j];

            // 拿到旧子节点oldVNode去新的一组子节点中寻找具有相同的key值的节点
            const has = newChildren.find(vnode => vnode.key === oldVNode.key);
            if (!has) {
              unmount(oldVNode);
            }
            // 如果找到了具有相同的节点，可以复用，但是仍然要调用patch函数更新
            if (newVNode.key === oldVNode.key) {
              // 一旦找到可复用的节点，则将变量find的值变为true
              find = true;
              patch(oldVNode, newVNode, container);
              if (j < lastIndex) {
                // 如果当前找到的节点在旧的children中的索引小于最大索引值lastIndex, 说明该节点对应的真实DOM需要移动
                // 获取newVNode的前一个node
                const prevVNode = newChildren[j - 1];
                // 如果prevVNode不存在，则说明当前的newVNode是第一个节点，不需要移动
                if (prevVNode) {
                  // 获取prevVNode所对应真实DOM的下一个兄弟节点，将其作为锚点
                  const anchor = prevVNode.el.nextSibling;
                  // 调用平台API insert，将newVNode对应的真实DOM插入到锚点元素后面，也就是prevVNode对应真实DOM的后面
                  insert(newVNode.el, container, anchor);
                }
              } else {
                // 如果当前找到的节点在旧children中的索引不小于最大索引值
                // 更新lastIndex的值
                lastIndex = j;
              }
              break;
            }
          }
          // find仍然为false时
          // newVNode没有在旧的子节点中找到可复用的节点，也就是newVNode是新增的，需要挂载
          if (!find) {
            const prevVNode = newChildren[i - 1];
            let anchor = null;
            if (prevVNode) {
              // 使用它的下一个兄弟节点
              anchor = prevVNode.el.nextSibling;
            } else {
              // 如果没有，说明新挂载的节点是第一个子节点
              // 使用容器的第一个子元素
              anchor = container.firstChild;
            }
            // 挂载
            patch(null, newVNode, container, anchor);
          }
        }
        // 旧的一组子节点的长度
        const oldLen = oldChildren.length;
        // 新的一组子节点的长度
        const newLen = newChildren.length;
        // 两组子节点的公共长度，即两者中较短的一组子节点的长度
        const commenLength = Math.min(oldLen, newLen);
        // 遍历commenLength次
        for (let i = 0; i < commenLength; i++) {
          patch(oldChildren[i], newChildren[i], container);
        }
        // 如果newLen > oldLen，说明有新的子节点需要挂载
        if (newLen > oldLen) {
          for (let i = commenLength; i < newLen; i++) {
            patch(null, newChildren[i], container);
          }
        } else if (oldLen > newLen) {
          // 说明有旧的子节点需要卸载
          for (let i = commenLength; i < oldLen; i++) {
            unmount(oldChildren[i]);
          }
        }
      } else {
        // 旧子节点要么是文本子节点，要么不存在
        // 只需要将容器清空，然后将一组新子节点添加到容器中
        setElementText(container, '');
        nw.children.forEach(v => patch(null, v, container))
      }
    } else {
      // 说明新子节点不存在
      // 旧子节点是一组子节点，只需要逐个卸载即可
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      } else if (typeof n1.children === 'string') {
        // 清空即可
        setElementText(container, '');
      }
      // 如果也没有旧子节点，什么都不需要做
    }
  }

  function hydrate(vnode, container) {

  }


  return {
    render,
    hydrate
  }
}


const renderer = createRenderer({
  createElement(tag) { 
    console.log(`创建元素 ${tag}`);
    return {
      tag
    }
  },
  setElementText(el, text) { 
    console.log(`设置元素${JSON.stringify(el)}的文本内容${text}`);
    el.textContent = text;
  },
  insert(el, parent, ahchor = null) {
    console.log(`将 ${JSON.stringify(el)} 插入到 ${JSON.stringify(parent)}}下`)
    parent.insertBefore(el, anchor);
  },
  // 将属性相关设置封装到patchProps中，并作为渲染器选项传递
  patchProps(el, key, prevValue, nextValue) {
    if (/^on/.test(key)) {
      // 获取为该元素伪造的事件处理函数
      // 定义el._vei(vue event invoker)为一个对象，存在事件名称到事件处理函数的映射
      const invokers = el._vei || (el._vei = {});
      let invoker = invokers[key];
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          // 将一个伪造的invoker缓存到el._vei属性上
          invoker = el._vei[key] = (e) => {
            // 如果事件发生的时间早于事件处理函数绑定的时间，则不执行
            if (e.timeStamp < invoker.attached) return;
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn) => fn(e));
            } else {
              // 当伪造的事件处理函数执行时，才会执行真正的处理函数
              invoker.value(e);
            }
          }
          // 将真正的事件处理函数赋值给invoker.value
          invoker.value = nextValue;
          // 添加attached属性，存储事件处理函数被绑定的时间
          invoker.attached = performance.now();
          // 添加invoker.value作为事件处理函数，绑定事件处理函数
          el.addEventListener(name, invoker);
        } else {
          // 更新invoker.value
          invoker.value = nextValue;
        }
      }
      else if (invoker) {
        // 新的事件处理函数不存在，且旧事件处理函数存在，移除绑定
        el.removeEventListener(name, invoker);
      }
    }
    // 对class进行特殊处理
    else if (key === 'class') {
      el.className = nextValue || '';
    }
    else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key];
      if (type === 'boolean' && nextValue === '') {
        el[key] = true;
      } else {
        el[key] = nextValue;
      }
    }
    else {
      el.setAttribute(key, nextValue);
    }
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(el, text) {
    el.nodeValue = text
  }
})