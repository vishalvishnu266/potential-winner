// Package layout provides composable layout primitives — Row, Column,
// Grid and ratio-based variants — so screens can be assembled without
// writing bespoke CSS every time. Everything is driven by CSS classes
// declared in web/css/layout.css.
package layout

import (
	"strconv"
	"strings"

	"github.com/maxence-charriere/go-app/v11/pkg/app"
)

// -----------------------------------------------------------------------------
// Shared alignment/justify types
// -----------------------------------------------------------------------------

type Align string

const (
	AlignStart    Align = "start"
	AlignCenter   Align = "center"
	AlignEnd      Align = "end"
	AlignStretch  Align = "stretch"
	AlignBaseline Align = "baseline"
)

type Justify string

const (
	JustifyStart   Justify = "start"
	JustifyCenter  Justify = "center"
	JustifyEnd     Justify = "end"
	JustifyBetween Justify = "between"
	JustifyAround  Justify = "around"
	JustifyEvenly  Justify = "evenly"
)

// Gap uses a token scale (0-8) mapped to CSS spacing variables.
type Gap int

// Container is the shared interface implemented by all layout primitives.
type Container interface {
	app.UI
	Body(children ...app.UI) app.UI
}

// -----------------------------------------------------------------------------
// Row  — horizontal flex container
// -----------------------------------------------------------------------------

type row struct {
	app.Compo
	Ialign    Align
	Ijustify  Justify
	Igap      Gap
	Iwrap     bool
	Ichildren []app.UI
}

// NewRow creates a horizontal flex row.
func NewRow() *row { return &row{Ialign: AlignStretch, Ijustify: JustifyStart} }

func (r *row) Align(a Align) *row     { r.Ialign = a; return r }
func (r *row) Justify(j Justify) *row { r.Ijustify = j; return r }
func (r *row) Gap(g Gap) *row         { r.Igap = g; return r }
func (r *row) Wrap(w bool) *row       { r.Iwrap = w; return r }
func (r *row) Body(children ...app.UI) *row {
	r.Ichildren = children
	return r
}

func (r *row) Render() app.UI {
	classes := classes("l-row",
		"l-align-"+string(r.Ialign),
		"l-justify-"+string(r.Ijustify),
		"l-gap-"+strconv.Itoa(int(r.Igap)),
		boolClass("l-wrap", r.Iwrap),
	)
	return app.Div().Class(classes).Body(r.Ichildren...)
}

// -----------------------------------------------------------------------------
// Column — vertical flex container
// -----------------------------------------------------------------------------

type column struct {
	app.Compo
	Ialign    Align
	Ijustify  Justify
	Igap      Gap
	Ichildren []app.UI
}

func NewColumn() *column { return &column{Ialign: AlignStretch, Ijustify: JustifyStart} }

func (c *column) Align(a Align) *column     { c.Ialign = a; return c }
func (c *column) Justify(j Justify) *column { c.Ijustify = j; return c }
func (c *column) Gap(g Gap) *column         { c.Igap = g; return c }
func (c *column) Body(children ...app.UI) *column {
	c.Ichildren = children
	return c
}

func (c *column) Render() app.UI {
	classes := classes("l-col",
		"l-align-"+string(c.Ialign),
		"l-justify-"+string(c.Ijustify),
		"l-gap-"+strconv.Itoa(int(c.Igap)),
	)
	return app.Div().Class(classes).Body(c.Ichildren...)
}

// -----------------------------------------------------------------------------
// Grid — CSS grid with fixed columns/rows
// -----------------------------------------------------------------------------

type grid struct {
	app.Compo
	Icols     int
	Irows     int
	Igap      Gap
	Ichildren []app.UI
}

func NewGrid(cols int) *grid { return &grid{Icols: cols} }

func (g *grid) Rows(r int) *grid { g.Irows = r; return g }
func (g *grid) Gap(gp Gap) *grid { g.Igap = gp; return g }
func (g *grid) Body(children ...app.UI) *grid {
	g.Ichildren = children
	return g
}

func (g *grid) Render() app.UI {
	style := "grid-template-columns:repeat(" + strconv.Itoa(g.Icols) + ",minmax(0,1fr));"
	if g.Irows > 0 {
		style += "grid-template-rows:repeat(" + strconv.Itoa(g.Irows) + ",minmax(0,1fr));"
	}
	return app.Div().
		Class(classes("l-grid", "l-gap-"+strconv.Itoa(int(g.Igap)))).
		Style("display", "grid").
		Style("grid-template-columns", "repeat("+strconv.Itoa(g.Icols)+",minmax(0,1fr))").
		Body(g.Ichildren...)
	_ = style
}

// -----------------------------------------------------------------------------
// RowRatio / ColumnRatio — flex containers where each child occupies
// a share of the available space based on integer ratios.
// -----------------------------------------------------------------------------

type ratioChild struct {
	Flex int
	UI   app.UI
}

// R is a small helper to declare a ratio child inline.
func R(flex int, ui app.UI) ratioChild { return ratioChild{Flex: flex, UI: ui} }

type rowRatio struct {
	app.Compo
	Igap      Gap
	Ialign    Align
	Ichildren []ratioChild
}

func NewRowRatio() *rowRatio { return &rowRatio{Ialign: AlignStretch} }

func (r *rowRatio) Gap(g Gap) *rowRatio     { r.Igap = g; return r }
func (r *rowRatio) Align(a Align) *rowRatio { r.Ialign = a; return r }
func (r *rowRatio) Body(children ...ratioChild) *rowRatio {
	r.Ichildren = children
	return r
}

func (r *rowRatio) Render() app.UI {
	wrapped := make([]app.UI, 0, len(r.Ichildren))
	for _, c := range r.Ichildren {
		wrapped = append(wrapped,
			app.Div().
				Class("l-ratio-item").
				Style("flex", strconv.Itoa(c.Flex)+" "+strconv.Itoa(c.Flex)+" 0%").
				Body(c.UI),
		)
	}
	return app.Div().
		Class(classes("l-row", "l-align-"+string(r.Ialign), "l-gap-"+strconv.Itoa(int(r.Igap)))).
		Body(wrapped...)
}

type columnRatio struct {
	app.Compo
	Igap      Gap
	Ijustify  Justify
	Ichildren []ratioChild
}

func NewColumnRatio() *columnRatio { return &columnRatio{Ijustify: JustifyStart} }

func (c *columnRatio) Gap(g Gap) *columnRatio         { c.Igap = g; return c }
func (c *columnRatio) Justify(j Justify) *columnRatio { c.Ijustify = j; return c }
func (c *columnRatio) Body(children ...ratioChild) *columnRatio {
	c.Ichildren = children
	return c
}

func (c *columnRatio) Render() app.UI {
	wrapped := make([]app.UI, 0, len(c.Ichildren))
	for _, ch := range c.Ichildren {
		wrapped = append(wrapped,
			app.Div().
				Class("l-ratio-item").
				Style("flex", strconv.Itoa(ch.Flex)+" "+strconv.Itoa(ch.Flex)+" 0%").
				Body(ch.UI),
		)
	}
	return app.Div().
		Class(classes("l-col", "l-justify-"+string(c.Ijustify), "l-gap-"+strconv.Itoa(int(c.Igap)))).
		Body(wrapped...)
}

// -----------------------------------------------------------------------------
// Spacer / Center / Padding / Stack helpers
// -----------------------------------------------------------------------------

// Spacer expands to fill remaining flex space.
func Spacer() app.UI { return app.Div().Class("l-spacer") }

// Center centers its child horizontally and vertically.
func Center(child app.UI) app.UI {
	return app.Div().Class("l-center").Body(child)
}

// Padded wraps a child with a padding token (0-8).
func Padded(p int, child app.UI) app.UI {
	return app.Div().Class("l-pad-" + strconv.Itoa(p)).Body(child)
}

// Stack overlays children on top of one another using position:absolute.
func Stack(children ...app.UI) app.UI {
	return app.Div().Class("l-stack").Body(children...)
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

func classes(parts ...string) string {
	filtered := parts[:0]
	for _, p := range parts {
		if p != "" {
			filtered = append(filtered, p)
		}
	}
	return strings.Join(filtered, " ")
}

func boolClass(cls string, cond bool) string {
	if cond {
		return cls
	}
	return ""
}
