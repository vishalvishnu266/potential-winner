/**
 * ERP Framework - Component Factories (mapping to Lit elements)
 */
class Component {
    constructor(tagOrElement) {
        this.el = typeof tagOrElement === 'string' ? document.createElement(tagOrElement) : tagOrElement;
    }
    id(idString) { this.el.id = idString; return this; }
    add(...children) {
        children.forEach(child => {
            if (typeof child === 'string') this.el.appendChild(document.createTextNode(child));
            else if (child instanceof Component) this.el.appendChild(child.el);
            else if (child instanceof HTMLElement) this.el.appendChild(child);
        });
        return this;
    }
    addClass(...classes) { this.el.classList.add(...classes); return this; }
    attr(name, val) { this.el.setAttribute(name, val); return this; }
    text(content) { this.el.textContent = content; return this; }
    onClick(handler) { this.el.addEventListener('click', handler); return this; }
    removeAll() { this.el.innerHTML = ''; return this; }
}

function updateDOM(action, targetId, childComponentOrElement) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl && action !== 'remove') return;
    let node = childComponentOrElement instanceof Component ? childComponentOrElement.el : childComponentOrElement;
    switch (action) {
        case 'prepend': if (node) targetEl.insertBefore(node, targetEl.firstChild); break;
        case 'replace': if (node) targetEl.replaceWith(node); break;
        case 'update': targetEl.innerHTML = ''; if (node) targetEl.appendChild(node); break;
        case 'remove': if (targetEl) targetEl.remove(); break;
    }
}

window.Component = Component;
window.updateDOM = updateDOM;
window.VerticalLayout = (...c) => new Component('erp-layout').attr('direction', 'vertical').add(...c);
window.HorizontalLayout = (...c) => new Component('erp-layout').attr('direction', 'horizontal').add(...c);
window.Card = (...c) => new Component('erp-card').add(...c);
window.H1 = (txt) => new Component('h1').text(txt);
window.H2 = (txt) => new Component('h2').text(txt);
window.Text = (txt) => new Component('span').text(txt);
window.Paragraph = (txt) => new Component('p').text(txt);
window.Button = class Button extends Component { 
    constructor(text, onClickHandler, variant = 'primary') { 
        super('erp-button'); 
        this.text(text); 
        if (variant !== 'primary') this.attr('variant', variant); 
        if (onClickHandler) this.onClick(onClickHandler); 
    } 
};
window.TextField = class TextField extends Component { 
    constructor(placeholder = '') { 
        super('erp-textfield'); 
        if (placeholder) this.attr('placeholder', placeholder); 
    } 
    getValue() { return this.el.value; } 
    setValue(val) { this.el.value = val; return this; } 
};
