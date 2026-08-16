import { LitElement, html, css } from 'lit';

// 1. Layout Component
export class ERPLayout extends LitElement {
    static properties = {
        direction: { type: String }
    };
    static styles = css`
        :host { display: flex; gap: 1rem; }
        :host([direction="vertical"]) { flex-direction: column; }
        :host([direction="horizontal"]) { flex-direction: row; align-items: center; }
    `;
    render() { return html`<slot></slot>`; }
}
customElements.define('erp-layout', ERPLayout);

// 2. Card Component
export class ERPCard extends LitElement {
    static styles = css`
        :host {
            display: block;
            background: var(--surface, white);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--border, #dee2e6);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
    `;
    render() { return html`<slot></slot>`; }
}
customElements.define('erp-card', ERPCard);

// 3. Button Component
export class ERPButton extends LitElement {
    static properties = {
        variant: { type: String }
    };
    static styles = css`
        button {
            width: 100%;
            padding: 0.8rem 1.2rem;
            background: var(--primary, #0066cc);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            font-size: 1rem;
            transition: all 0.2s;
        }
        button:active { opacity: 0.8; transform: scale(0.98); }
        :host([variant="secondary"]) button { background: #6c757d; }
        :host([variant="outline"]) button { background: transparent; color: #333; border: 1px solid #ccc; }
    `;
    render() {
        return html`<button><slot></slot></button>`;
    }
}
customElements.define('erp-button', ERPButton);

// 4. TextField Component
export class ERPTextField extends LitElement {
    static properties = {
        placeholder: { type: String },
        value: { type: String }
    };
    static styles = css`
        :host { display: block; width: 100%; }
        input {
            width: 100%;
            padding: 0.8rem;
            border: 1px solid var(--border, #ccc);
            border-radius: 8px;
            font-size: 1rem;
            box-sizing: border-box;
            font-family: inherit;
            outline: none;
        }
        input:focus { border-color: var(--primary, #0066cc); box-shadow: 0 0 0 2px rgba(0,102,204,0.1); }
    `;
    
    constructor() {
        super();
        this.value = '';
    }

    _handleInput(e) {
        this.value = e.target.value;
    }

    render() {
        return html`<input 
            type="text" 
            .value="${this.value}" 
            placeholder="${this.placeholder || ''}" 
            @input="${this._handleInput}"
        />`;
    }
}
customElements.define('erp-textfield', ERPTextField);
