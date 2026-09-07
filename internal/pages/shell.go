// Package pages contains top-level route components. Every page is
// rendered inside a common Shell that provides the navigation bar and
// consistent padding.
package pages

import (
	"github.com/maxence-charriere/go-app/v11/pkg/app"

	"github.com/yourorg/mobileapp/internal/components/layout"
	"github.com/yourorg/mobileapp/internal/components/ui"
	"github.com/yourorg/mobileapp/internal/i18n"
)

// Shell wraps a page body with the app bar and safe-area padding.
func Shell(body ...app.UI) app.UI {
	bar := ui.NewAppBar(i18n.T("app.title")).Items(
		ui.NewNavItem(i18n.T("nav.home"), "/"),
		ui.NewNavItem(i18n.T("nav.about"), "/about"),
		ui.NewNavItem(i18n.T("nav.settings"), "/settings"),
	)
	return app.Div().Class("app-shell").Body(
		bar,
		app.Main().Class("app-main").Body(
			layout.Padded(4, layout.NewColumn().Gap(4).Body(body...)),
		),
	)
}
