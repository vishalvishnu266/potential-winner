// Package ui hosts the reusable, look-and-feel-consistent visual
// components. All styling lives in web/css/components.css so that a
// single change reshapes every screen uniformly.
package ui

import (
	"strings"

	"github.com/maxence-charriere/go-app/v11/pkg/app"
)

// ------------------------------------------------------------------
// Variants
// ------------------------------------------------------------------

type Variant string

const (
	VariantPrimary   Variant = "primary"
	VariantSecondary Variant = "secondary"
	VariantGhost     Variant = "ghost"
	VariantDanger    Variant = "danger"
)

type Size string

const (
	SizeSm Size = "sm"
	SizeMd Size = "md"
	SizeLg Size = "lg"
)

// ------------------------------------------------------------------
// Button
// ------------------------------------------------------------------

type Clickable interface {
	OnClick(func(app.Context, app.Event)) Clickable
}

type button struct {
	app.Compo
	Ilabel   string
	Ivariant Variant
	Isize    Size
	Ihandler func(app.Context, app.Event)
	Idisable bool
	IfullW   bool
}

func NewButton(label string) *button {
	return &button{Ilabel: label, Ivariant: VariantPrimary, Isize: SizeMd}
}

func (b *button) Variant(v Variant) *button { b.Ivariant = v; return b }
func (b *button) Size(s Size) *button       { b.Isize = s; return b }
func (b *button) Disabled(d bool) *button   { b.Idisable = d; return b }
func (b *button) FullWidth(f bool) *button  { b.IfullW = f; return b }
func (b *button) OnClick(h func(app.Context, app.Event)) *button {
	b.Ihandler = h
	return b
}

func (b *button) Render() app.UI {
	cls := join("c-btn",
		"c-btn--"+string(b.Ivariant),
		"c-btn--"+string(b.Isize),
		cond(b.IfullW, "c-btn--full"),
	)
	btn := app.Button().
		Class(cls).
		Disabled(b.Idisable).
		Text(b.Ilabel)
	if b.Ihandler != nil {
		btn = btn.OnClick(b.Ihandler)
	}
	return btn
}

// ------------------------------------------------------------------
// Card
// ------------------------------------------------------------------

type card struct {
	app.Compo
	Ititle    string
	Isubtitle string
	Ichildren []app.UI
}

func NewCard() *card                             { return &card{} }
func (c *card) Title(t string) *card             { c.Ititle = t; return c }
func (c *card) Subtitle(s string) *card          { c.Isubtitle = s; return c }
func (c *card) Body(ch ...app.UI) *card          { c.Ichildren = ch; return c }

func (c *card) Render() app.UI {
	var header app.UI
	if c.Ititle != "" || c.Isubtitle != "" {
		header = app.Div().Class("c-card__header").Body(
			app.If(c.Ititle != "", func() app.UI {
				return app.H3().Class("c-card__title").Text(c.Ititle)
			}),
			app.If(c.Isubtitle != "", func() app.UI {
				return app.P().Class("c-card__subtitle").Text(c.Isubtitle)
			}),
		)
	}
	return app.Div().Class("c-card").Body(
		app.If(header != nil, func() app.UI { return header }),
		app.Div().Class("c-card__body").Body(c.Ichildren...),
	)
}

// ------------------------------------------------------------------
// Text
// ------------------------------------------------------------------

type TextVariant string

const (
	TextH1    TextVariant = "h1"
	TextH2    TextVariant = "h2"
	TextH3    TextVariant = "h3"
	TextBody  TextVariant = "body"
	TextMuted TextVariant = "muted"
	TextLabel TextVariant = "label"
)

type text struct {
	app.Compo
	Ivariant TextVariant
	Ivalue   string
}

func NewText(v string) *text                         { return &text{Ivariant: TextBody, Ivalue: v} }
func (t *text) Variant(v TextVariant) *text          { t.Ivariant = v; return t }

func (t *text) Render() app.UI {
	cls := "c-text c-text--" + string(t.Ivariant)
	switch t.Ivariant {
	case TextH1:
		return app.H1().Class(cls).Text(t.Ivalue)
	case TextH2:
		return app.H2().Class(cls).Text(t.Ivalue)
	case TextH3:
		return app.H3().Class(cls).Text(t.Ivalue)
	default:
		return app.P().Class(cls).Text(t.Ivalue)
	}
}

// ------------------------------------------------------------------
// Input
// ------------------------------------------------------------------

type input struct {
	app.Compo
	Iplaceholder string
	Ivalue       string
	Itype        string
	Ilabel       string
	Ihandler     func(app.Context, app.Event)
}

func NewInput() *input                                    { return &input{Itype: "text"} }
func (i *input) Placeholder(p string) *input              { i.Iplaceholder = p; return i }
func (i *input) Value(v string) *input                    { i.Ivalue = v; return i }
func (i *input) Type(t string) *input                     { i.Itype = t; return i }
func (i *input) Label(l string) *input                    { i.Ilabel = l; return i }
func (i *input) OnChange(h func(app.Context, app.Event)) *input {
	i.Ihandler = h
	return i
}

func (i *input) Render() app.UI {
	in := app.Input().
		Class("c-input").
		Type(i.Itype).
		Placeholder(i.Iplaceholder).
		Value(i.Ivalue)
	if i.Ihandler != nil {
		in = in.OnChange(i.Ihandler)
	}
	if i.Ilabel == "" {
		return in
	}
	return app.Label().Class("c-field").Body(
		app.Span().Class("c-field__label").Text(i.Ilabel),
		in,
	)
}

// ------------------------------------------------------------------
// Select
// ------------------------------------------------------------------

type Option struct {
	Value string
	Label string
}

type selectC struct {
	app.Compo
	Ilabel   string
	Ivalue   string
	Iopts    []Option
	Ihandler func(app.Context, app.Event)
}

func NewSelect() *selectC                             { return &selectC{} }
func (s *selectC) Label(l string) *selectC            { s.Ilabel = l; return s }
func (s *selectC) Value(v string) *selectC            { s.Ivalue = v; return s }
func (s *selectC) Options(o ...Option) *selectC       { s.Iopts = o; return s }
func (s *selectC) OnChange(h func(app.Context, app.Event)) *selectC {
	s.Ihandler = h
	return s
}

func (s *selectC) Render() app.UI {
	opts := make([]app.UI, 0, len(s.Iopts))
	for _, o := range s.Iopts {
		opt := app.Option().Value(o.Value).Text(o.Label)
		if o.Value == s.Ivalue {
			opt = opt.Selected(true)
		}
		opts = append(opts, opt)
	}
	sel := app.Select().Class("c-select").Body(opts...)
	if s.Ihandler != nil {
		sel = sel.OnChange(s.Ihandler)
	}
	if s.Ilabel == "" {
		return sel
	}
	return app.Label().Class("c-field").Body(
		app.Span().Class("c-field__label").Text(s.Ilabel),
		sel,
	)
}

// ------------------------------------------------------------------
// Divider
// ------------------------------------------------------------------

func Divider() app.UI { return app.Div().Class("c-divider") }

// ------------------------------------------------------------------
// Badge
// ------------------------------------------------------------------

func Badge(label string, v Variant) app.UI {
	return app.Span().
		Class("c-badge c-badge--" + string(v)).
		Text(label)
}

// ------------------------------------------------------------------
// AppBar / NavBar
// ------------------------------------------------------------------

type navItem struct {
	Label string
	Href  string
}

func NewNavItem(label, href string) navItem { return navItem{Label: label, Href: href} }

type appBar struct {
	app.Compo
	Ititle string
	Iitems []navItem
}

func NewAppBar(title string) *appBar             { return &appBar{Ititle: title} }
func (a *appBar) Items(items ...navItem) *appBar { a.Iitems = items; return a }

func (a *appBar) Render() app.UI {
	links := make([]app.UI, 0, len(a.Iitems))
	for _, it := range a.Iitems {
		links = append(links,
			app.A().Class("c-appbar__link").Href(it.Href).Text(it.Label),
		)
	}
	return app.Header().Class("c-appbar").Body(
		app.Div().Class("c-appbar__title").Text(a.Ititle),
		app.Nav().Class("c-appbar__nav").Body(links...),
	)
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

func join(parts ...string) string {
	out := parts[:0]
	for _, p := range parts {
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, " ")
}

func cond(b bool, s string) string {
	if b {
		return s
	}
	return ""
}
