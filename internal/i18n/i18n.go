// Package i18n provides a minimal, dependency-free localisation
// facility. Translations are registered in-memory as maps keyed by
// locale, then looked up through the Translator interface.
package i18n

import (
	"strings"

	"github.com/maxence-charriere/go-app/v11/pkg/app"
)

// Locale identifies a language (BCP-47 short form: "en", "fr", "es"…).
type Locale string

const (
	LocaleEN Locale = "en"
	LocaleFR Locale = "fr"
	LocaleES Locale = "es"

	storageKey     = "app.locale"
	defaultLocale  = LocaleEN
	fallbackMarker = "??"
)

// Translator is the contract every i18n backend must expose.
type Translator interface {
	Locale() Locale
	SetLocale(Locale)
	T(key string, args ...any) string
	Available() []Locale
}

// bundle stores translations for a single locale.
type bundle map[string]string

// registry is the default implementation of Translator.
type registry struct {
	bundles map[Locale]bundle
}

// Default is the process-wide translator.
var Default Translator = newRegistry()

func newRegistry() *registry {
	r := &registry{bundles: map[Locale]bundle{}}
	r.bundles[LocaleEN] = bundle{
		"app.title":         "MobileApp",
		"nav.home":          "Home",
		"nav.about":         "About",
		"nav.settings":      "Settings",
		"home.welcome":      "Welcome to MobileApp",
		"home.subtitle":     "Built with Go, WASM and Capacitor.",
		"home.cta":          "Get started",
		"about.title":       "About",
		"about.body":        "This demo showcases layout primitives, themes and i18n.",
		"settings.title":    "Settings",
		"settings.theme":    "Theme",
		"settings.language": "Language",
		"settings.toggle":   "Toggle theme",
		"common.light":      "Light",
		"common.dark":       "Dark",
		"common.system":     "System",
	}
	r.bundles[LocaleFR] = bundle{
		"app.title":         "MobileApp",
		"nav.home":          "Accueil",
		"nav.about":         "À propos",
		"nav.settings":      "Paramètres",
		"home.welcome":      "Bienvenue sur MobileApp",
		"home.subtitle":     "Conçu avec Go, WASM et Capacitor.",
		"home.cta":          "Commencer",
		"about.title":       "À propos",
		"about.body":        "Cette démo présente les primitives de mise en page, les thèmes et l'i18n.",
		"settings.title":    "Paramètres",
		"settings.theme":    "Thème",
		"settings.language": "Langue",
		"settings.toggle":   "Changer de thème",
		"common.light":      "Clair",
		"common.dark":       "Sombre",
		"common.system":     "Système",
	}
	r.bundles[LocaleES] = bundle{
		"app.title":         "MobileApp",
		"nav.home":          "Inicio",
		"nav.about":         "Acerca de",
		"nav.settings":      "Ajustes",
		"home.welcome":      "Bienvenido a MobileApp",
		"home.subtitle":     "Hecho con Go, WASM y Capacitor.",
		"home.cta":          "Comenzar",
		"about.title":       "Acerca de",
		"about.body":        "Esta demo muestra primitivas de diseño, temas e i18n.",
		"settings.title":    "Ajustes",
		"settings.theme":    "Tema",
		"settings.language": "Idioma",
		"settings.toggle":   "Cambiar tema",
		"common.light":      "Claro",
		"common.dark":       "Oscuro",
		"common.system":     "Sistema",
	}
	return r
}

// Init loads persisted locale (if any). Client-side only.
func Init() {
	// Simply touches storage so future reads are consistent.
	_ = Default.Locale()
}

// Locale returns the currently active locale.
func (r *registry) Locale() Locale {
	v := app.Window().Get("localStorage").Call("getItem", storageKey)
	if v.IsNull() || v.IsUndefined() {
		return defaultLocale
	}
	loc := Locale(v.String())
	if _, ok := r.bundles[loc]; !ok {
		return defaultLocale
	}
	return loc
}

// SetLocale persists and switches the active locale, then triggers
// a UI update.
func (r *registry) SetLocale(l Locale) {
	if _, ok := r.bundles[l]; !ok {
		l = defaultLocale
	}
	app.Window().Get("localStorage").Call("setItem", storageKey, string(l))
}

// T translates a key. Positional {0}, {1}… placeholders inside the
// translation are substituted with the provided args.
func (r *registry) T(key string, args ...any) string {
	loc := r.Locale()
	if b, ok := r.bundles[loc]; ok {
		if v, ok := b[key]; ok {
			return format(v, args...)
		}
	}
	if b, ok := r.bundles[defaultLocale]; ok {
		if v, ok := b[key]; ok {
			return format(v, args...)
		}
	}
	return fallbackMarker + key + fallbackMarker
}

// Available lists all registered locales.
func (r *registry) Available() []Locale {
	out := make([]Locale, 0, len(r.bundles))
	for k := range r.bundles {
		out = append(out, k)
	}
	return out
}

// format performs simple positional substitution.
func format(s string, args ...any) string {
	for i, a := range args {
		placeholder := "{" + itoa(i) + "}"
		s = strings.ReplaceAll(s, placeholder, toString(a))
	}
	return s
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

func toString(a any) string {
	switch v := a.(type) {
	case string:
		return v
	case int:
		return itoa(v)
	default:
		return ""
	}
}

// T is a package-level convenience wrapper.
func T(key string, args ...any) string { return Default.T(key, args...) }
