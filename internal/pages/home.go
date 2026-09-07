package pages

import (
	"github.com/maxence-charriere/go-app/v11/pkg/app"

	"github.com/yourorg/mobileapp/internal/components/layout"
	"github.com/yourorg/mobileapp/internal/components/ui"
	"github.com/yourorg/mobileapp/internal/i18n"
)

// Home is the landing page.
type Home struct {
	app.Compo
}

func (h *Home) Render() app.UI {
	return Shell(
		ui.NewText(i18n.T("home.welcome")).Variant(ui.TextH1),
		ui.NewText(i18n.T("home.subtitle")).Variant(ui.TextMuted),

		// Demo of layout primitives: 2-column grid of cards.
		layout.NewGrid(2).Gap(3).Body(
			ui.NewCard().Title("Row/Column").Subtitle("Flex primitives").Body(
				ui.NewText("Compose horizontal & vertical stacks with tokens."),
			),
			ui.NewCard().Title("Grid").Subtitle("CSS grid wrapper").Body(
				ui.NewText("Declare N columns and drop children in."),
			),
			ui.NewCard().Title("Row Ratio").Subtitle("Weighted flex").Body(
				layout.NewRowRatio().Gap(2).Body(
					layout.R(1, ui.Badge("1", ui.VariantPrimary)),
					layout.R(2, ui.Badge("2", ui.VariantSecondary)),
					layout.R(3, ui.Badge("3", ui.VariantGhost)),
				),
			),
			ui.NewCard().Title("Column Ratio").Subtitle("Weighted stack").Body(
				layout.NewColumnRatio().Gap(2).Body(
					layout.R(1, ui.Badge("A", ui.VariantPrimary)),
					layout.R(1, ui.Badge("B", ui.VariantDanger)),
				),
			),
		),

		layout.NewRow().Gap(2).Justify(layout.JustifyCenter).Body(
			ui.NewButton(i18n.T("home.cta")).
				Variant(ui.VariantPrimary).
				Size(ui.SizeLg),
		),
	)
}
