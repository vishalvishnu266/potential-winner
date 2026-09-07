package pages

import (
	"github.com/maxence-charriere/go-app/v11/pkg/app"

	"github.com/yourorg/mobileapp/internal/components/layout"
	"github.com/yourorg/mobileapp/internal/components/ui"
	"github.com/yourorg/mobileapp/internal/i18n"
	"github.com/yourorg/mobileapp/internal/theme"
)

// Settings lets the user pick the theme and language.
type Settings struct {
	app.Compo
}

func (s *Settings) Render() app.UI {
	current := theme.Default.Get()
	locale := i18n.Default.Locale()

	// Build language options from whichever locales are registered.
	locales := i18n.Default.Available()
	opts := make([]ui.Option, 0, len(locales))
	for _, l := range locales {
		opts = append(opts, ui.Option{Value: string(l), Label: string(l)})
	}

	return Shell(
		ui.NewText(i18n.T("settings.title")).Variant(ui.TextH1),

		ui.NewCard().Title(i18n.T("settings.theme")).Body(
			layout.NewRow().Gap(2).Body(
				ui.NewButton(i18n.T("common.light")).
					Variant(themeVariant(current, theme.ModeLight)).
					OnClick(func(ctx app.Context, _ app.Event) {
						theme.Default.Set(theme.ModeLight)
						ctx.Reload()
					}),
				ui.NewButton(i18n.T("common.dark")).
					Variant(themeVariant(current, theme.ModeDark)).
					OnClick(func(ctx app.Context, _ app.Event) {
						theme.Default.Set(theme.ModeDark)
						ctx.Reload()
					}),
				ui.NewButton(i18n.T("common.system")).
					Variant(themeVariant(current, theme.ModeSystem)).
					OnClick(func(ctx app.Context, _ app.Event) {
						theme.Default.Set(theme.ModeSystem)
						ctx.Reload()
					}),
			),
		),

		ui.NewCard().Title(i18n.T("settings.language")).Body(
			ui.NewSelect().
				Label(i18n.T("settings.language")).
				Value(string(locale)).
				Options(opts...).
				OnChange(func(ctx app.Context, e app.Event) {
					v := ctx.JSSrc().Get("value").String()
					i18n.Default.SetLocale(i18n.Locale(v))
					ctx.Reload()
				}),
		),
	)
}

// themeVariant returns primary for the active mode, ghost otherwise.
func themeVariant(current, target theme.Mode) ui.Variant {
	if current == target {
		return ui.VariantPrimary
	}
	return ui.VariantGhost
}
