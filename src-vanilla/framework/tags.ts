/**
 * Vaadin-style semantic component factories built on top of `UIComponent`.
 *
 * These are just thin wrappers around `El(tag)` with sensible defaults so
 * views read declaratively:
 *
 *   VerticalLayout().cls('card').add(
 *     H1('Hello'),
 *     Paragraph('World'),
 *     Button('Click me').onClick(...)
 *   )
 */

import { El, UIComponent } from './dom';

// --- Layouts -----------------------------------------------------------------

export const VerticalLayout = (): UIComponent<'div'> => El('div').cls('col');
export const HorizontalLayout = (): UIComponent<'div'> => El('div').cls('row');
export const FormLayout = (): UIComponent<'form'> => El('form').cls('col');
export const Section = (): UIComponent<'section'> => El('section');

// --- Text --------------------------------------------------------------------

export const H1 = (t: string): UIComponent<'h1'> => El('h1').text(t);
export const H2 = (t: string): UIComponent<'h2'> => El('h2').text(t);
export const H3 = (t: string): UIComponent<'h3'> => El('h3').text(t);
export const Paragraph = (t: string): UIComponent<'p'> => El('p').text(t);
export const Span = (t: string): UIComponent<'span'> => El('span').text(t);
export const Muted = (t: string): UIComponent<'span'> => El('span').cls('muted').text(t);

// --- Interactive -------------------------------------------------------------

export const Button = (label: string): UIComponent<'button'> =>
  El('button').cls('btn').text(label);

export const PrimaryButton = (label: string): UIComponent<'button'> =>
  El('button').cls('btn primary').text(label);

export const DangerButton = (label: string): UIComponent<'button'> =>
  El('button').cls('btn danger').text(label);

export const TextField = (placeholder = ''): UIComponent<'input'> =>
  El('input').cls('input').type('text').placeholder(placeholder);

export const NumberField = (placeholder = ''): UIComponent<'input'> =>
  El('input').cls('input').type('number').placeholder(placeholder);

// --- Lists / structure -------------------------------------------------------

export const UList = (): UIComponent<'ul'> => El('ul');
export const OList = (): UIComponent<'ol'> => El('ol');
export const ListItem = (): UIComponent<'li'> => El('li');
export const HR = (): UIComponent<'hr'> => El('hr');
export const Anchor = (label: string, href: string): UIComponent<'a'> =>
  El('a').text(label).href(href);

// --- Composite ---------------------------------------------------------------

export const Card = (): UIComponent<'div'> => El('div').cls('card');
