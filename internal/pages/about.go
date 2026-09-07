package pages

import (
	"github.com/maxence-charriere/go-app/v11/pkg/app"

	"github.com/yourorg/mobileapp/internal/components/ui"
	"github.com/yourorg/mobileapp/internal/i18n"
)

// About shows information about the app.
type About struct {
	app.Compo
}

func (a *About) Render() app.UI {
	return Shell(
		ui.NewText(i18n.T("about.title")).Variant(ui.TextH1),
		ui.NewText(i18n.T("about.body")).Variant(ui.TextBody),
		ui.Divider(),
		ui.NewCard().Title("Stack").Body(
			ui.NewText("Go + WebAssembly + go-app v11 + Capacitor"),
		),
	)
}
