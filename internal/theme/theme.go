// Package theme handles light/dark mode switching by toggling a
// `data-theme` attribute on the <html> element. The actual colours
// are defined as CSS custom properties in web/css/theme.css so that
// every component looks identical across the app.
package theme

import "github.com/maxence-charriere/go-app/v11/pkg/app"

// Mode is the enumeration of supported themes.
type Mode string

const (
	ModeLight  Mode = "light"
	ModeDark   Mode = "dark"
	ModeSystem Mode = "system"

	storageKey = "app.theme"
)

// Theme is the interface all theme managers must satisfy.
type Theme interface {
	Get() Mode
	Set(Mode)
	Toggle()
	Apply()
}

// manager is the default implementation of Theme.
type manager struct{}

// Default is the singleton theme manager used across the app.
var Default Theme = &manager{}

// Init reads the stored preference and applies it. Should be called
// once at start-up on the client side.
func Init() {
	Default.Apply()
}

// Get returns the currently stored theme mode. Defaults to system.
func (m *manager) Get() Mode {
	v := app.Window().Get("localStorage").Call("getItem", storageKey)
	if v.IsNull() || v.IsUndefined() {
		return ModeSystem
	}
	switch Mode(v.String()) {
	case ModeLight:
		return ModeLight
	case ModeDark:
		return ModeDark
	default:
		return ModeSystem
	}
}

// Set stores and applies the requested theme mode.
func (m *manager) Set(mode Mode) {
	app.Window().Get("localStorage").Call("setItem", storageKey, string(mode))
	m.Apply()
}

// Toggle cycles light → dark → system → light.
func (m *manager) Toggle() {
	switch m.Get() {
	case ModeLight:
		m.Set(ModeDark)
	case ModeDark:
		m.Set(ModeSystem)
	default:
		m.Set(ModeLight)
	}
}

// Apply sets the data-theme attribute on <html> based on the stored
// preference (respecting the OS preference when in system mode).
func (m *manager) Apply() {
	mode := m.Get()
	effective := string(mode)
	if mode == ModeSystem {
		matches := app.Window().
			Call("matchMedia", "(prefers-color-scheme: dark)").
			Get("matches").
			Bool()
		if matches {
			effective = string(ModeDark)
		} else {
			effective = string(ModeLight)
		}
	}
	app.Window().
		Get("document").
		Get("documentElement").
		Call("setAttribute", "data-theme", effective)
}
