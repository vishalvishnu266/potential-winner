/**
 * ERP Framework - Vanilla JS Component System
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

customElements.define('v-layout', class extends HTMLElement { connectedCallback() { if (!this.hasAttribute('direction')) this.setAttribute('direction', 'vertical'); } });
customElements.define('v-card', class extends HTMLElement {});
customElements.define('v-button', class extends HTMLElement {
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>button { width: 100%; padding: 0.8rem 1.2rem; background: var(--primary, #0066cc); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 1rem; transition: opacity 0.2s; } button:active { opacity: 0.8; } :host([variant="secondary"]) button { background: #6c757d; } :host([variant="outline"]) button { background: transparent; color: #333; border: 1px solid #ccc; }</style><button><slot></slot></button>`;
    }
});
customElements.define('v-textfield', class extends HTMLElement {
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>:host { display: block; width: 100%; } input { width: 100%; padding: 0.8rem; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; box-sizing: border-box; font-family: inherit; }</style><input type="text" />`;
        this._input = this.shadowRoot.querySelector('input');
    }
    connectedCallback() { if (this.hasAttribute('placeholder')) this._input.placeholder = this.getAttribute('placeholder'); if (this.hasAttribute('value')) this._input.value = this.getAttribute('value'); }
    get value() { return this._input.value; }
    set value(val) { this._input.value = val; }
});

window.Component = Component;
window.updateDOM = updateDOM;
window.VerticalLayout = (...c) => new Component('v-layout').attr('direction', 'vertical').add(...c);
window.HorizontalLayout = (...c) => new Component('v-layout').attr('direction', 'horizontal').add(...c);
window.Card = (...c) => new Component('v-card').add(...c);
window.H1 = (txt) => new Component('h1').text(txt);
window.H2 = (txt) => new Component('h2').text(txt);
window.Text = (txt) => new Component('span').text(txt);
window.Paragraph = (txt) => new Component('p').text(txt);
window.Button = class Button extends Component { constructor(text, onClickHandler, variant = 'primary') { super('v-button'); this.text(text); if (variant !== 'primary') this.attr('variant', variant); if (onClickHandler) this.onClick(onClickHandler); } };
window.TextField = class TextField extends Component { constructor(placeholder = '') { super('v-textfield'); if (placeholder) this.attr('placeholder', placeholder); } getValue() { return this.el.value; } setValue(val) { this.el.value = val; return this; } };
